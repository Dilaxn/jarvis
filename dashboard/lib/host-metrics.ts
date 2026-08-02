import fs from 'fs'
import Dockerode from 'dockerode'

function getDocker() {
  const host = process.env.DOCKER_HOST ?? 'tcp://socket-proxy:2375'
  const match = host.match(/^tcp:\/\/([^:]+):(\d+)$/)
  if (match) return new Dockerode({ host: match[1], port: parseInt(match[2]) })
  return new Dockerode({ socketPath: '/var/run/docker.sock' })
}

export interface HostSnapshot {
  cpu: { load1: number; load5: number; load15: number; cores: number; pct: number }
  mem: { usedMb: number; totalMb: number; pct: number }
}

export interface ContainerSnapshot {
  name: string
  cpuPct: number
  memMb: number
  memLimitMb: number
  state: string
}

export function readHostMetrics(): HostSnapshot {
  // CPU load
  const loadavg = fs.readFileSync('/host/proc/loadavg', 'utf-8').trim().split(' ')
  const load1 = parseFloat(loadavg[0])
  const load5 = parseFloat(loadavg[1])
  const load15 = parseFloat(loadavg[2])

  const cpuinfo = fs.readFileSync('/host/proc/cpuinfo', 'utf-8')
  const cores = (cpuinfo.match(/^processor/gm) ?? []).length || 1
  const pct = Math.min((load1 / cores) * 100, 100)

  // RAM
  const meminfo = fs.readFileSync('/host/proc/meminfo', 'utf-8')
  const totalKb = parseInt(meminfo.match(/MemTotal:\s+(\d+)/)?.[1] ?? '0')
  const availKb = parseInt(meminfo.match(/MemAvailable:\s+(\d+)/)?.[1] ?? '0')
  const usedMb = (totalKb - availKb) / 1024
  const totalMb = totalKb / 1024
  const memPct = totalMb > 0 ? (usedMb / totalMb) * 100 : 0

  return {
    cpu: { load1, load5, load15, cores, pct },
    mem: { usedMb, totalMb, pct: memPct },
  }
}

export async function readContainerMetrics(): Promise<ContainerSnapshot[]> {
  const docker = getDocker()
  const containers = await docker.listContainers({ all: false })

  const results = await Promise.allSettled(
    containers
      .filter(c => c.Names.some(n => n.startsWith('/paas-')))
      .map(async (info) => {
        const name = info.Names[0].replace(/^\//, '')
        const c = docker.getContainer(info.Id)
        const stats = await new Promise<any>((res, rej) =>
          c.stats({ stream: false }, (err: any, data: any) => err ? rej(err) : res(data))
        )

        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
        const sysDelta = (stats.cpu_stats.system_cpu_usage ?? 0) - (stats.precpu_stats.system_cpu_usage ?? 0)
        const numCpus = stats.cpu_stats.online_cpus ?? 1
        const cpuPct = sysDelta > 0 ? (cpuDelta / sysDelta) * numCpus * 100 : 0

        const memMb = stats.memory_stats.usage / (1024 * 1024)
        const memLimitMb = stats.memory_stats.limit / (1024 * 1024)

        return { name, cpuPct, memMb, memLimitMb, state: info.State } as ContainerSnapshot
      })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<ContainerSnapshot> => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => b.cpuPct - a.cpuPct)
}
