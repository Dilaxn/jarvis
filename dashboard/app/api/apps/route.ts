import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAllContainerStatuses } from '@/lib/docker'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  const apps = db
    .prepare('SELECT * FROM applications WHERE enabled = 1 ORDER BY name')
    .all() as Array<{
      id: number
      name: string
      display_name: string
      repo: string
      domain: string
      container_name: string
      image: string
      internal_port: number
      health_url: string
    }>

  const statuses = await getAllContainerStatuses()

  const result = apps.map((app) => {
    const s = statuses[app.container_name] ?? {
      state: 'unknown',
      status: 'Not found',
      image: app.image,
    }
    return {
      ...app,
      container_state: s.state,
      container_status: s.status,
      container_image: s.image,
    }
  })

  return NextResponse.json(result)
}
