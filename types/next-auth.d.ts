import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image: string;
    };
    accessToken?: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    spotifyId?: string;
    error?: string;
    user?: {
      id: string;
      email: string;
      name: string;
      image: string;
    };
  }
}
