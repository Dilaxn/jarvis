import { getIronSession } from 'iron-session'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sessionOptions, type SessionData } from '@/lib/session'

const PUBLIC = ['/login', '/api/auth/', '/api/healthz']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(request, res, sessionOptions)

  if (!session.userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
