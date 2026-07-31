import bcrypt from 'bcryptjs'

export async function initDb() {
  // Lazy import so this only runs in Node.js runtime
  const { getDb } = await import('./db')
  const db = getDb()

  // Create admin user if none exists
  const user = db.prepare('SELECT id FROM users LIMIT 1').get()
  if (!user) {
    const password = process.env.ADMIN_PASSWORD ?? 'jarvis'
    const hash = await bcrypt.hash(password, 12)
    db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    ).run('admin', hash)
    console.log('[JARVIS] Admin user created (username: admin)')
  }

  // Seed applications if empty
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM applications')
    .get() as { count: number }

  if (count === 0) {
    seedApplications(db)
    console.log('[JARVIS] Applications seeded')
  }
}

function seedApplications(db: ReturnType<typeof import('./db').getDb>) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO applications
      (name, display_name, repo, domain, container_name, image, internal_port, health_url)
    VALUES
      (@name, @display_name, @repo, @domain, @container_name, @image, @internal_port, @health_url)
  `)

  const apps = [
    {
      name: 'dashboard',
      display_name: 'J.A.R.V.I.S',
      repo: 'Dilaxn/jarvis',
      domain: process.env.DASHBOARD_DOMAIN ?? 'ops.dilax.space',
      container_name: 'paas-dashboard',
      image: 'ghcr.io/dilaxn/paas-dashboard',
      internal_port: 3000,
      health_url: 'http://dashboard:3000/api/healthz',
    },
    {
      name: 'lanka-news',
      display_name: 'Lanka News',
      repo: 'Dilaxn/lanka-news',
      domain: process.env.LANKA_NEWS_DOMAIN ?? 'lankanews.dilax.space',
      container_name: 'paas-lanka-news',
      image: 'ghcr.io/dilaxn/lanka-news',
      internal_port: 3001,
      health_url: 'http://lanka-news:3001/health',
    },
    {
      name: 'invitation',
      display_name: 'Invitation',
      repo: 'Dilaxn/invitation',
      domain: process.env.INVITATION_DOMAIN ?? 'invite.dilax.space',
      container_name: 'paas-invitation',
      image: 'ghcr.io/dilaxn/invitation',
      internal_port: 3002,
      health_url: 'http://invitation:3002/health',
    },
    {
      name: 'pms',
      display_name: 'PMS',
      repo: 'Dilaxn/pms',
      domain: process.env.PMS_DOMAIN ?? 'pms.dilax.space',
      container_name: 'paas-pms',
      image: 'ghcr.io/dilaxn/pms',
      internal_port: 3003,
      health_url: 'http://pms:3003/health',
    },
    {
      name: 'prince',
      display_name: 'Prince',
      repo: 'Dilaxn/prince',
      domain: process.env.PRINCE_DOMAIN ?? 'prince.dilax.space',
      container_name: 'paas-prince',
      image: 'ghcr.io/dilaxn/prince',
      internal_port: 3004,
      health_url: 'http://prince:3004/health',
    },
    {
      name: 'webpulse',
      display_name: 'WebPulse',
      repo: 'Dilaxn/webpulse',
      domain: process.env.WEBPULSE_DOMAIN ?? 'webpulse.dilax.space',
      container_name: 'paas-webpulse',
      image: 'ghcr.io/dilaxn/webpulse',
      internal_port: 3005,
      health_url: 'http://webpulse:3005/health',
    },
  ]

  for (const app of apps) insert.run(app)
}
