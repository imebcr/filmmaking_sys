import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    pages: { signIn: '/member-login' },
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  },
)

export const config = {
  matcher: ['/me/:path*', '/api/member/:path*'],
}
