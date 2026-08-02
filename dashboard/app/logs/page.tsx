'use client'

import { useEffect, useRef, useState } from 'react'
import Sidebar from '@/components/Sidebar'

const CONTAINERS = [
  { label: 'JARVIS Dashboard', value: 'paas-dashboard' },
  { label: 'Invitation',       value: 'paas-invitation' },
  { label: 'Lanka News',       value: 'paas-lanka-news' },
  { label: 'PMS',              value: 'paas-pms' },
  { label: 'Prince',           value: 'paas-prince' },
  { label: 'WebPulse',         value: 'paas-webpulse' },
  { label: 'Caddy',            value: 'paas-caddy-1' },
  { label: 'Postgres',         value: 'paas-postgres' },
  { label: 'MySQL',            value: 'paas-mysql' },
  { label: 'Redis',            value: 'paas-redis' },
  { label: 'MongoDB',          value: 'paas-mongodb' },
]

function colorLine(line: string) {
  if (/error|fatal|exception|failed|denied/i.test(line)) return 'text-red-400'
  if (/warn/i.test(line)) return 'text-amber-400'
  if (/info|started|ready|success|healthy/i.test(line)) return 'text-emerald-400'
  return 'text-slate-400'
}

export default function LogsPage() {
  const [container, setContainer] = useState(CONTAINERS[0].value)
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tail, setTail] = useState(150)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function fetchLogs(c = container, t = tail) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/logs?container=${c}&tail=${t}`)
      const data = await res.json()
      if (data.error) { setError(data.error); setLines([]) }
      else { setLines(data.lines) }
    } catch { setError('Failed to fetch logs') }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [container, tail])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  return (
    <div className="min-h-screen flex" style={{ background: '#080c14' }}>
      <Sidebar />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 p-4 md:p-8 flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-cyan-500 rounded-full" />
            <h1 className="text-xl font-bold text-slate-100 tracking-wide">Container Logs</h1>
          </div>
          <p className="text-slate-500 text-sm ml-4">Live output from Docker containers</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={container}
            onChange={e => setContainer(e.target.value)}
            className="bg-[#0b1020] border border-cyan-900/30 text-cyan-300 text-sm rounded px-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500/50"
          >
            {CONTAINERS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={tail}
            onChange={e => setTail(parseInt(e.target.value))}
            className="bg-[#0b1020] border border-cyan-900/30 text-cyan-300 text-sm rounded px-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500/50"
          >
            {[50, 100, 150, 300, 500].map(n => (
              <option key={n} value={n}>Last {n} lines</option>
            ))}
          </select>

          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-mono rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-40"
          >
            {loading ? 'Loading…' : '↺ Refresh'}
          </button>

          <span className="ml-auto text-slate-600 text-xs font-mono">{lines.length} lines</span>
        </div>

        {/* Log viewer */}
        <div
          className="flex-1 rounded-lg border border-cyan-900/20 overflow-auto font-mono text-xs leading-relaxed"
          style={{ background: '#060a10', minHeight: '60vh', maxHeight: '72vh' }}
        >
          {error && (
            <div className="p-4 text-red-400">{error}</div>
          )}
          {!error && lines.length === 0 && !loading && (
            <div className="p-4 text-slate-600">No log output.</div>
          )}
          <div className="p-4 space-y-0.5">
            {lines.map((line, i) => (
              <div key={i} className={`${colorLine(line)} whitespace-pre-wrap break-all`}>
                <span className="text-slate-700 select-none mr-3">{String(i + 1).padStart(4, ' ')}</span>
                {line}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </main>
    </div>
  )
}
