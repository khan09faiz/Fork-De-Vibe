import NextAuth, { NextAuthOptions } from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import { db } from '@/lib/db';

const scopes = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-recently-played'
].join(' ');

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken
      })
    });

    const refreshedTokens = await response.json();

    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: { scope: scopes }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at! * 1000;
        token.spotifyId = account.providerAccountId;
        token.user = {
          id: user.id,
          email: user.email!,
          name: user.name!,
          image: user.image!
        };
      }

      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = token.user as any;
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'spotify') {
        // Fetch full user profile from Spotify to get country and other data
        let spotifyUserData = null;
        try {
          const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
              Authorization: `Bearer ${account.access_token}`
            }
          });
          if (response.ok) {
            spotifyUserData = await response.json();
          }
        } catch (error) {
          console.error('Error fetching Spotify user data:', error);
        }

        const existingUser = await db.user.findUnique({
          where: { spotifyId: account.providerAccountId }
        });

        if (!existingUser) {
          let username = user.name?.toLowerCase().replace(/\s+/g, '_') || 'user';
          let isUnique = false;
          let attempts = 0;

          while (!isUnique && attempts < 10) {
            const existing = await db.user.findUnique({ where: { username } });
            if (!existing) {
              isUnique = true;
            } else {
              username = `${username}_${Math.floor(Math.random() * 1000)}`;
              attempts++;
            }
          }

          const newUser = await db.user.create({
            data: {
              spotifyId: account.providerAccountId,
              email: user.email!,
              username,
              displayName: user.name,
              imageUrl: user.image,
              country: spotifyUserData?.country || null, // ISO 3166-1 alpha-2 code
              isPublic: true
            }
          });
          
          user.id = newUser.id;
        } else {
          // Update country if it's not set or if it changed
          if (spotifyUserData?.country && existingUser.country !== spotifyUserData.country) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { country: spotifyUserData.country }
            });
          }
          user.id = existingUser.id;
        }
      }
      return true;
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
