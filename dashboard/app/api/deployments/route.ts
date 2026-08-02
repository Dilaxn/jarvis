import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT d.*, a.name as app_name, a.display_name
    FROM deployments d
    JOIN applications a ON a.id = d.app_id
    ORDER BY d.created_at DESC
    LIMIT 50
  `).all()
  return NextResponse.json(rows)
}
