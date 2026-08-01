'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface ServiceCost { service: string; amount: number }
interface CostData {
  mtd: number
  lastMonth: number
  forecast: number | null
  byService: ServiceCost[]
  dailyAvg: number
  fetchedAt: string
  error?: string
}

function fmt(n: number) {
  return n.toFixed(2)
}

function ServiceBar({ name, amount, max }: { name: string; amount: number; max: number }) {
  const pct = max > 0 ? (amount / max) * 100 : 0
  // Shorten long AWS service names
  const short = name
    .replace('Amazon Elastic Compute Cloud - Compute', 'EC2 Compute')
    .replace('Amazon Simple Storage Service', 'S3')
    .replace('Amazon Relational Database Service', 'RDS')
    .replace('Amazon Elastic Container Service', 'ECS')
    .replace('AWS Data Transfer', 'Data Transfer')
    .replace('Amazon Route 53', 'Route 53')
    .replace('Amazon CloudWatch', 'CloudWatch')
    .replace('Amazon Virtual Private Cloud', 'VPC')
    .replace('Amazon Elastic Block Store', 'EBS')
    .replace('Tax', 'Tax')

  return (
    <div className="flex items-center gap-3 group">
      <span className="text-slate-400 text-xs font-mono w-36 truncate shrink-0" title={name}>
        {short}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-cyan-900/20">
        <div
          className="h-1.5 rounded-full bg-cyan-500/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-cyan-300 text-xs font-mono w-14 text-right shrink-0">
        ${fmt(amount)}
      </span>
    </div>
  )
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/costs')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const maxService = data?.byService?.[0]?.amount ?? 1
  const monthlyProjection = (data?.mtd ?? 0) + (data?.forecast ?? 0)
  const delta = data ? data.mtd - data.lastMonth : 0
  const deltaSign = delta >= 0 ? '+' : ''

  return (
    <div className="min-h-screen flex" style={{ background: '#080c14' }}>
      <Sidebar />

      <main className="flex-1 ml-56 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-cyan-500 rounded-full" />
            <h1 className="text-xl font-bold text-slate-100 tracking-wide">AWS Cost Tracker</h1>
          </div>
          <p className="text-slate-500 text-sm ml-4">Current month spend via Cost Explorer</p>
        </div>

        {loading && (
          <div className="text-slate-500 text-sm font-mono animate-pulse">Fetching cost data…</div>
        )}

        {data?.error && (
          <div className="rounded-lg border border-red-900/40 px-5 py-4 text-red-400 text-sm font-mono"
               style={{ background: '#0b1020' }}>
            Error: {data.error}
          </div>
        )}

        {data && !data.error && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Month to Date', value: `$${fmt(data.mtd)}`, sub: 'current spend', color: 'text-cyan-400' },
                { label: 'Projected Total', value: `$${fmt(monthlyProjection)}`, sub: 'mtd + forecast', color: 'text-violet-400' },
                { label: 'Daily Average', value: `$${fmt(data.dailyAvg)}`, sub: 'this month', color: 'text-emerald-400' },
                { label: 'vs Last Month', value: `${deltaSign}$${fmt(Math.abs(delta))}`, sub: `last: $${fmt(data.lastMonth)}`, color: delta > 1 ? 'text-amber-400' : 'text-emerald-400' },
              ].map(card => (
                <div key={card.label}
                     className="rounded-lg border border-cyan-900/20 px-5 py-4"
                     style={{ background: '#0b1020' }}>
                  <p className="text-slate-500 text-xs font-mono mb-2">{card.label}</p>
                  <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
                  <p className="text-slate-600 text-xs mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Budget guardrail */}
            <div className="rounded-lg border border-cyan-900/20 px-5 py-4" style={{ background: '#0b1020' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-xs font-mono">MONTHLY BUDGET — $20.00 target</p>
                <span className={`text-xs font-mono ${monthlyProjection > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {monthlyProjection > 20 ? '⚠ OVER BUDGET' : '✓ ON TRACK'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-cyan-900/20">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${monthlyProjection > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((monthlyProjection / 25) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-slate-600 text-xs font-mono">$0</span>
                <span className="text-slate-600 text-xs font-mono">$25 alarm</span>
              </div>
            </div>

            {/* Service breakdown */}
            <div className="rounded-lg border border-cyan-900/20 px-5 py-5" style={{ background: '#0b1020' }}>
              <p className="text-slate-400 text-xs font-mono mb-4">SPEND BY SERVICE</p>
              <div className="space-y-3">
                {data.byService.length === 0 && (
                  <p className="text-slate-600 text-xs font-mono">No charges recorded yet this month.</p>
                )}
                {data.byService.map(s => (
                  <ServiceBar key={s.service} name={s.service} amount={s.amount} max={maxService} />
                ))}
              </div>
            </div>

            <p className="text-slate-700 text-xs font-mono text-right">
              cached · fetched {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
