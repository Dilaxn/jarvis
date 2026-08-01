import { NextResponse } from 'next/server'
import { getCostSummary } from '@/lib/costs'

// Cache for 1 hour — Cost Explorer charges $0.01 per API call
export const revalidate = 3600

export async function GET() {
  try {
    const data = await getCostSummary()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
