import ContainerBadge from './ContainerBadge'

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

const appColors: Record<string, string> = {
  dashboard: 'bg-cyan-500/20 text-cyan-400',
  'lanka-news': 'bg-blue-500/20 text-blue-400',
  invitation: 'bg-purple-500/20 text-purple-400',
  pms: 'bg-orange-500/20 text-orange-400',
  prince: 'bg-pink-500/20 text-pink-400',
  webpulse: 'bg-green-500/20 text-green-400',
}

export default function AppCard({ app }: { app: App }) {
  const initials = app.display_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colorClass = appColors[app.name] ?? 'bg-slate-500/20 text-slate-400'

  return (
    <div className="jarvis-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border border-white/5 ${colorClass}`}
          >
            {initials}
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-sm">{app.display_name}</h3>
            <p className="text-slate-500 text-xs font-mono">:{app.internal_port}</p>
          </div>
        </div>
        <ContainerBadge state={app.container_state} />
      </div>

      {/* Status string */}
      <p className="text-xs text-slate-500 font-mono">{app.container_status}</p>

      {/* Domain */}
      <div className="border-t border-cyan-900/20 pt-3 flex items-center justify-between">
        <a
          href={`https://${app.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-600 hover:text-cyan-400 font-mono truncate transition-colors"
        >
          {app.domain}
        </a>
        <span className="text-slate-700 text-xs font-mono">{app.name}</span>
      </div>
    </div>
  )
}
