import type { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: number
  username?: string
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    'fallback-dev-secret-min-32-chars-long-change-in-prod',
  cookieName: 'jarvis_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}
