import Database from 'better-sqlite3';
import path from 'path';
import { getCloudEnv } from './cloud-env';

export interface DBClient {
  prepare(sql: string): any;
  exec(sql: string): void | Promise<void>;
}

class LocalDB implements DBClient {
  private db: Database.Database;
  constructor() {
    const dbPath = path.join(process.cwd(), 'data.db');
    this.db = new Database(dbPath);
  }
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...params: any[]) => stmt.run(...params),
      get: async (...params: any[]) => stmt.get(...params),
      all: async (...params: any[]) => stmt.all(...params),
    };
  }
  async exec(sql: string) {
    this.db.exec(sql);
  }
}

class D1Client implements DBClient {
  private d1: any;
  constructor(d1: any) {
    this.d1 = d1;
  }
  prepare(sql: string) {
    const stmt = this.d1.prepare(sql);
    return {
      run: (...params: any[]) => stmt.bind(...params).run(),
      get: (...params: any[]) => stmt.bind(...params).first(),
      all: (...params: any[]) => stmt.bind(...params).all().then(r => r.results),
    };
  }
  async exec(sql: string) {
    await this.d1.exec(sql);
  }
}

let dbInstance: DBClient | null = null;

export function getDB(): DBClient {
  const env = getCloudEnv();
  if (env.ART_GALLERY_DB) {
    if (!(dbInstance instanceof D1Client)) {
      dbInstance = new D1Client(env.ART_GALLERY_DB);
    }
    return dbInstance;
  }
  
  if (!dbInstance) {
    dbInstance = new LocalDB();
  }
  return dbInstance;
}

// Initializing tables (Node only, for D1 you use wrangler d1 migrations)
// But for small apps we can check in code
export async function initDB(db: DBClient) {
  const schema = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      source_id TEXT UNIQUE,
      title TEXT,
      artist TEXT,
      year TEXT,
      museum TEXT,
      image_url TEXT,
      source_url TEXT,
      ai_interpretation TEXT,
      keywords TEXT,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      is_visible INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      artwork_id TEXT REFERENCES artworks(id) ON DELETE CASCADE,
      content TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at DESC);
  `;
  
  await db.exec(schema);
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  await insertSetting.run('ai_provider', 'gemini');
  await insertSetting.run('model_id', 'gemini-2.0-flash');
  await insertSetting.run('api_key', '');
  await insertSetting.run('daily_limit', '1');
}

// Export a getter for backward compatibility or direct use if initialized
export const db = getDB();
export default db;
