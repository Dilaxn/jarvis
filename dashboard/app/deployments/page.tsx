'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface Deployment {
  id: number
  app_name: string
  display_name: string
  git_sha: string | null
  status: string
  trigger: string
  triggered_by: string | null
  ci_run_url: string | null
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success:    'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    failed:     'text-red-400    border-red-500/30     bg-red-500/10',
    deploying:  'text-cyan-400   border-cyan-500/30    bg-cyan-500/10',
    building:   'text-violet-400 border-violet-500/30  bg-violet-500/10',
    rolled_back:'text-amber-400  border-amber-500/30   bg-amber-500/10',
    queued:     'text-slate-400  border-slate-500/30   bg-slate-500/10',
  }
  const cls = map[status] ?? 'text-slate-400 border-slate-600 bg-slate-800'
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {status.toUpperCase()}
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DeploymentsPage() {
  const [rows, setRows] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/deployments')
      .then(r => r.json())
      .then(d => { setRows(d); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen flex" style={{ background: '#080c14' }}>
      <Sidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-cyan-500 rounded-full" />
            <h1 className="text-xl font-bold text-slate-100 tracking-wide">Deployments</h1>
          </div>
          <p className="text-slate-500 text-sm ml-4">Recent CI/CD pipeline runs across all apps</p>
        </div>

        <div className="rounded-lg border border-cyan-900/20 overflow-hidden" style={{ background: '#0b1020' }}>
          {loading && (
            <div className="p-6 text-slate-500 text-sm font-mono animate-pulse">Loading…</div>
          )}

          {!loading && rows.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500 text-sm mb-2">No deployments recorded yet.</p>
              <p className="text-slate-600 text-xs font-mono">
                Deployments are recorded automatically when CI/CD pipelines post to{' '}
                <code className="text-cyan-700">/api/hooks/deployment</code>
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-900/20">
                  <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">APP</th>
                  <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">STATUS</th>
                  <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">SHA</th>
                  <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">ACTOR</th>
                  <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">WHEN</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(d => (
                  <tr key={d.id} className="border-b border-cyan-900/10 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-slate-200 font-medium">{d.display_name}</span>
                      <span className="text-slate-600 text-xs ml-2">{d.app_name}</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">
                      {d.git_sha ? d.git_sha.slice(0, 7) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {d.triggered_by?.replace('github:', '') ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{timeAgo(d.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      {d.ci_run_url && (
                        <a
                          href={d.ci_run_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-700 hover:text-cyan-400 font-mono transition-colors"
                        >
                          GH →
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
