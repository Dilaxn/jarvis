import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('x-webhook-secret')
  const expected = process.env.WEBHOOK_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { app, sha, status, actor, runUrl } = body

  if (!app || !status) {
    return NextResponse.json({ error: 'app and status required' }, { status: 400 })
  }

  const db = getDb()
  const application = db.prepare('SELECT id FROM applications WHERE name = ?').get(app) as { id: number } | undefined

  if (!application) {
    return NextResponse.json({ error: `Unknown app: ${app}` }, { status: 404 })
  }

  db.prepare(`
    INSERT INTO deployments (app_id, git_sha, image_tag, status, trigger, triggered_by, ci_run_url, started_at, finished_at)
    VALUES (?, ?, ?, ?, 'push', ?, ?, datetime('now'), datetime('now'))
  `).run(
    application.id,
    sha ?? null,
    sha ? `latest@${sha.slice(0, 7)}` : 'latest',
    status,
    actor ? `github:${actor}` : 'github',
    runUrl ?? null,
  )

  return NextResponse.json({ ok: true })
}
