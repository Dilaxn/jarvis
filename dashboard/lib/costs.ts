import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
} from '@aws-sdk/client-cost-explorer'

// Cost Explorer only works in us-east-1
const ce = new CostExplorerClient({ region: 'us-east-1' })

function monthRange(offsetMonths = 0) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1 + offsetMonths
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { Start: fmt(start), End: fmt(end) }
}

function todayRange() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m - 1, now.getUTCDate() + 1))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { Start: fmt(start), End: fmt(end) }
}

export interface ServiceCost {
  service: string
  amount: number
}

export interface CostSummary {
  mtd: number             // month-to-date USD
  lastMonth: number       // previous full month USD
  forecast: number | null // rest-of-month forecast USD
  byService: ServiceCost[]
  dailyAvg: number
  fetchedAt: string
}

export async function getCostSummary(): Promise<CostSummary> {
  const [mtdRes, lastRes, forecastRes] = await Promise.allSettled([
    ce.send(new GetCostAndUsageCommand({
      TimePeriod: todayRange(),
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    })),
    ce.send(new GetCostAndUsageCommand({
      TimePeriod: monthRange(-1),
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
    })),
    ce.send(new GetCostForecastCommand({
      TimePeriod: (() => {
        const now = new Date()
        const y = now.getUTCFullYear()
        const m = now.getUTCMonth() + 1
        const tomorrow = new Date(Date.UTC(y, m - 1, now.getUTCDate() + 1))
        const endOfMonth = new Date(Date.UTC(y, m, 1))
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        return { Start: fmt(tomorrow), End: fmt(endOfMonth) }
      })(),
      Granularity: 'MONTHLY',
      Metric: 'UNBLENDED_COST',
    })),
  ])

  // MTD by service
  const byService: ServiceCost[] = []
  let mtd = 0
  if (mtdRes.status === 'fulfilled') {
    const results = mtdRes.value.ResultsByTime?.[0]?.Groups ?? []
    for (const g of results) {
      const name = g.Keys?.[0] ?? 'Other'
      const amount = parseFloat(g.Metrics?.UnblendedCost?.Amount ?? '0')
      if (amount > 0.001) byService.push({ service: name, amount })
    }
    mtd = byService.reduce((s, x) => s + x.amount, 0)
  }
  byService.sort((a, b) => b.amount - a.amount)

  // Last month total
  const lastMonth = lastRes.status === 'fulfilled'
    ? parseFloat(lastRes.value.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount ?? '0')
    : 0

  // Forecast
  const forecast = forecastRes.status === 'fulfilled'
    ? parseFloat(forecastRes.value.Total?.Amount ?? '0')
    : null

  // Daily average (days elapsed this month)
  const dayOfMonth = new Date().getUTCDate()
  const dailyAvg = dayOfMonth > 0 ? mtd / dayOfMonth : 0

  return { mtd, lastMonth, forecast, byService, dailyAvg, fetchedAt: new Date().toISOString() }
}
