import { getCloudEnv } from './_cloud-env';

export interface DBClient {
  prepare(sql: string): {
    run(...params: any[]): Promise<any>;
    get(...params: any[]): Promise<any>;
    all(...params: any[]): Promise<any[]>;
  };
  exec(sql: string): Promise<void>;
}

class D1Client implements DBClient {
  constructor(private d1: any) {}
  prepare(sql: string) {
    const stmt = this.d1.prepare(sql);
    return {
      run: (...params: any[]) => params.length > 0 ? stmt.bind(...params).run() : stmt.run(),
      get: (...params: any[]) => params.length > 0 ? stmt.bind(...params).first() : stmt.first(),
      all: (...params: any[]) => params.length > 0 ? stmt.bind(...params).all().then((r: any) => r.results) : stmt.all().then((r: any) => r.results),
    };
  }
  async exec(sql: string) {
    await this.d1.exec(sql);
  }
}

let dbInstance: DBClient | null = null;

export async function getDB(): Promise<DBClient> {
  const env = getCloudEnv();
  
  if (!env || !env.ART_GALLERY_DB) {
    throw new Error('Cloudflare D1 binding "ART_GALLERY_DB" not found.');
  }

  if (!dbInstance) {
    dbInstance = new D1Client(env.ART_GALLERY_DB);
  }
  
  return dbInstance;
}

export async function initDB(db: DBClient) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  await db.prepare(`
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
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  await insertSetting.run('ai_provider', 'gemini');
  await insertSetting.run('model_id', 'gemini-1.5-flash');
  await insertSetting.run('daily_limit', '1');
}

export default {
  get instance() { return getDB(); }
};
