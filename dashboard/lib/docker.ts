import Dockerode from 'dockerode'

let docker: Dockerode | null = null

function getDocker(): Dockerode {
  if (docker) return docker

  const host = process.env.DOCKER_HOST ?? 'tcp://socket-proxy:2375'
  const match = host.match(/^tcp:\/\/([^:]+):(\d+)$/)
  if (match) {
    docker = new Dockerode({ host: match[1], port: parseInt(match[2]) })
  } else {
    docker = new Dockerode({ socketPath: '/var/run/docker.sock' })
  }
  return docker
}

export interface ContainerStatus {
  state: string   // 'running' | 'exited' | 'restarting' | 'unknown'
  status: string  // human string like "Up 2 hours"
  image: string
}

export async function getContainerStatus(
  containerName: string
): Promise<ContainerStatus> {
  try {
    const containers = await getDocker().listContainers({ all: true })
    const found = containers.find((c) =>
      c.Names.some((n) => n === `/${containerName}` || n === containerName)
    )
    if (!found) return { state: 'unknown', status: 'Not found', image: '' }
    return {
      state: found.State,
      status: found.Status,
      image: found.Image,
    }
  } catch {
    return { state: 'unknown', status: 'Docker unavailable', image: '' }
  }
}

export async function getAllContainerStatuses(): Promise<
  Record<string, ContainerStatus>
> {
  try {
    const containers = await getDocker().listContainers({ all: true })
    const result: Record<string, ContainerStatus> = {}
    for (const c of containers) {
      for (const name of c.Names) {
        const clean = name.replace(/^\//, '')
        result[clean] = {
          state: c.State,
          status: c.Status,
          image: c.Image,
        }
      }
    }
    return result
  } catch {
    return {}
  }
}
