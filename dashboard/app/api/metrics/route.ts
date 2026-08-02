import { NextResponse } from 'next/server'
import { readHostMetrics, readContainerMetrics } from '@/lib/host-metrics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [host, containers] = await Promise.all([
      readHostMetrics(),
      readContainerMetrics(),
    ])
    return NextResponse.json({ host, containers, ts: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
