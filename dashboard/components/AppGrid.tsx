'use client'

import { useEffect, useState, useCallback } from 'react'
import AppCard from './AppCard'

interface App {
  id: number
  name: string
  display_name: string
  domain: string
  internal_port: number
  container_name: string
  image: string
  container_state: string
  container_status: string
  container_image: string
}

export default function AppGrid() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState(false)

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch('/api/apps')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setApps(data)
      setLastRefresh(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApps()
    const interval = setInterval(fetchApps, 15_000)
    return () => clearInterval(interval)
  }, [fetchApps])

  const running = apps.filter((a) => a.container_state === 'running').length

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="text-emerald-400 font-bold text-sm">{running}</span>
            <span>/ {apps.length} running</span>
          </div>
          {error && (
            <span className="text-xs text-red-400 font-mono">⚠ Docker unreachable</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-600 font-mono">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchApps}
            className="btn-primary text-xs py-1 px-3"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="jarvis-card p-5 h-32 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                  <div className="h-2 bg-slate-800 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  )
}
