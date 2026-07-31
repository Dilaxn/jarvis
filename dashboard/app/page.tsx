import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import Sidebar from '@/components/Sidebar'
import AppGrid from '@/components/AppGrid'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  return (
    <div className="min-h-screen flex" style={{ background: '#080c14' }}>
      <Sidebar username={session.username} />

      {/* Main content */}
      <main className="flex-1 ml-56 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-cyan-500 rounded-full" />
            <h1 className="text-xl font-bold text-slate-100 tracking-wide">
              System Overview
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-4">
            All services managed on this PaaS instance
          </p>
        </div>

        {/* System info bar */}
        <div
          className="rounded-lg border border-cyan-900/20 px-5 py-3 mb-6 flex items-center gap-6 text-xs font-mono"
          style={{ background: '#0b1020' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-600">HOST</span>
            <span className="text-cyan-400">EC2 t4g.small</span>
          </div>
          <div className="w-px h-4 bg-cyan-900/40" />
          <div className="flex items-center gap-2">
            <span className="text-slate-600">PROXY</span>
            <span className="text-cyan-400">Caddy v2</span>
          </div>
          <div className="w-px h-4 bg-cyan-900/40" />
          <div className="flex items-center gap-2">
            <span className="text-slate-600">REGISTRY</span>
            <span className="text-cyan-400">ghcr.io</span>
          </div>
          <div className="w-px h-4 bg-cyan-900/40" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400">ONLINE</span>
          </div>
        </div>

        <AppGrid />
      </main>
    </div>
  )
}
