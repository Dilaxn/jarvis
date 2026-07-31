export default function ContainerBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    running: {
      label: 'RUNNING',
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
      dot: 'bg-emerald-400',
    },
    exited: {
      label: 'STOPPED',
      color: 'text-red-400 bg-red-400/10 border-red-400/30',
      dot: 'bg-red-400',
    },
    restarting: {
      label: 'RESTARTING',
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
      dot: 'bg-amber-400 animate-pulse',
    },
    dead: {
      label: 'DEAD',
      color: 'text-red-600 bg-red-900/10 border-red-600/30',
      dot: 'bg-red-600',
    },
  }

  const style = map[state] ?? {
    label: 'UNKNOWN',
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
    dot: 'bg-slate-500',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono tracking-wider ${style.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
