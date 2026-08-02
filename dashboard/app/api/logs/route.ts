import { NextRequest, NextResponse } from 'next/server'
import Dockerode from 'dockerode'

function getDocker() {
  const host = process.env.DOCKER_HOST ?? 'tcp://socket-proxy:2375'
  const match = host.match(/^tcp:\/\/([^:]+):(\d+)$/)
  if (match) return new Dockerode({ host: match[1], port: parseInt(match[2]) })
  return new Dockerode({ socketPath: '/var/run/docker.sock' })
}

// Demux Docker's multiplexed log stream (8-byte header per chunk)
function demux(buf: Buffer): string {
  const lines: string[] = []
  let offset = 0
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4)
    if (size === 0) { offset += 8; continue }
    const payload = buf.slice(offset + 8, offset + 8 + size).toString('utf-8')
    lines.push(payload)
    offset += 8 + size
  }
  return lines.join('')
}

export async function GET(req: NextRequest) {
  const container = req.nextUrl.searchParams.get('container')
  const tail = parseInt(req.nextUrl.searchParams.get('tail') ?? '150')

  if (!container) return NextResponse.json({ error: 'container required' }, { status: 400 })

  try {
    const docker = getDocker()
    const c = docker.getContainer(container)
    const buf = await c.logs({ stdout: true, stderr: true, tail, timestamps: true }) as unknown as Buffer
    const raw = demux(buf)
    const lines = raw.split('\n').filter(Boolean)
    return NextResponse.json({ lines })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
