'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface ContainerStat { name: string; cpuPct: number; memMb: number; memLimitMb: number; state: string }
interface MetricsData {
  host: {
    cpu: { load1: number; load5: number; load15: number; cores: number; pct: number }
    mem: { usedMb: number; totalMb: number; pct: number }
  }
  containers: ContainerStat[]
  ts: string
  error?: string
}

function Gauge({ pct, label, sub, warn = 70, danger = 90 }: {
  pct: number; label: string; sub: string; warn?: number; danger?: number
}) {
  const color = pct >= danger ? 'text-red-400' : pct >= warn ? 'text-amber-400' : 'text-emerald-400'
  const barColor = pct >= danger ? 'bg-red-500' : pct >= warn ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="rounded-lg border border-cyan-900/20 px-5 py-4 flex-1" style={{ background: '#0b1020' }}>
      <p className="text-slate-500 text-xs font-mono mb-3">{label}</p>
      <p className={`text-3xl font-bold font-mono mb-3 ${color}`}>{pct.toFixed(1)}%</p>
      <div className="h-1.5 rounded-full bg-cyan-900/20 mb-2">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="text-slate-600 text-xs">{sub}</p>
    </div>
  )
}

function fmt(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const r = await fetch('/api/metrics')
      setData(await r.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000) // auto-refresh every 15s
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen flex" style={{ background: '#080c14' }}>
      <Sidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-cyan-500 rounded-full" />
              <h1 className="text-xl font-bold text-slate-100 tracking-wide">System Metrics</h1>
            </div>
            <p className="text-slate-500 text-sm ml-4">Live host + container resource usage · auto-refreshes every 15s</p>
          </div>
          {data?.ts && (
            <p className="text-slate-600 text-xs font-mono">
              {new Date(data.ts).toLocaleTimeString()}
            </p>
          )}
        </div>

        {loading && <p className="text-slate-500 text-sm font-mono animate-pulse">Collecting metrics…</p>}

        {data?.error && (
          <div className="rounded-lg border border-red-900/40 px-5 py-4 text-red-400 text-sm font-mono" style={{ background: '#0b1020' }}>
            {data.error}
          </div>
        )}

        {data && !data.error && (
          <div className="space-y-6">
            {/* Host gauges */}
            <div>
              <p className="text-slate-500 text-xs font-mono mb-3">HOST — EC2 t4g.small ({data.host.cpu.cores} vCPU · {fmt(data.host.mem.totalMb)} RAM)</p>
              <div className="flex gap-4">
                <Gauge
                  pct={data.host.cpu.pct}
                  label="CPU LOAD"
                  sub={`1m: ${data.host.cpu.load1.toFixed(2)}  5m: ${data.host.cpu.load5.toFixed(2)}  15m: ${data.host.cpu.load15.toFixed(2)}`}
                />
                <Gauge
                  pct={data.host.mem.pct}
                  label="MEMORY"
                  sub={`${fmt(data.host.mem.usedMb)} used of ${fmt(data.host.mem.totalMb)}`}
                  warn={75} danger={90}
                />
              </div>
            </div>

            {/* Container table */}
            <div>
              <p className="text-slate-500 text-xs font-mono mb-3">CONTAINERS</p>
              <div className="rounded-lg border border-cyan-900/20 overflow-hidden" style={{ background: '#0b1020' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cyan-900/20">
                      <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">CONTAINER</th>
                      <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">CPU %</th>
                      <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">MEMORY</th>
                      <th className="text-left px-5 py-3 text-slate-500 text-xs font-mono font-normal">MEM %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.containers.map(c => {
                      const memPct = c.memLimitMb > 0 ? (c.memMb / c.memLimitMb) * 100 : 0
                      const cpuColor = c.cpuPct > 80 ? 'text-red-400' : c.cpuPct > 50 ? 'text-amber-400' : 'text-emerald-400'
                      const memColor = memPct > 80 ? 'text-red-400' : memPct > 60 ? 'text-amber-400' : 'text-cyan-300'
                      return (
                        <tr key={c.name} className="border-b border-cyan-900/10 hover:bg-white/[0.02]">
                          <td className="px-5 py-3 font-mono text-xs text-slate-300">{c.name.replace('paas-', '')}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1 rounded-full bg-cyan-900/20">
                                <div className="h-1 rounded-full bg-cyan-500/60" style={{ width: `${Math.min(c.cpuPct, 100)}%` }} />
                              </div>
                              <span className={`font-mono text-xs ${cpuColor}`}>{c.cpuPct.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className={`px-5 py-3 font-mono text-xs ${memColor}`}>{fmt(c.memMb)}</td>
                          <td className={`px-5 py-3 font-mono text-xs ${memColor}`}>{memPct.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
