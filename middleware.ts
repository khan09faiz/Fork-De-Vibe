import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login'
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/api/user/:path*', '/api/spotify/:path*']
};
