import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'dashboard.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run schema only if tables don't exist yet
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get()

  if (!exists) {
    const schemaPath = path.join(process.cwd(), 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    db.exec(schema)
  }

  return db
}
