import { getCloudEnv } from './cloud-env';

export interface DBClient {
  prepare(sql: string): any;
  exec(sql: string): void | Promise<void>;
}

class LocalDB implements DBClient {
  private db: any;
  private initialized = false;

  private async ensureInitialized() {
    if (this.initialized) return;
    try {
      // Check if we are in Node.js before trying to import
      const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
      if (!isNode) {
        throw new Error('Local SQLite is only supported in Node.js environment.');
      }

      // Use dynamic imports that are less likely to be aggressively bundled if the path is dynamic
      const sqliteModule = 'better-sqlite3';
      const pathModule = 'node:path';
      const { default: Database } = await import(sqliteModule);
      const { default: path } = await import(pathModule);
      const dbPath = path.join(process.cwd(), 'data.db');
      this.db = new Database(dbPath);
      this.initialized = true;
    } catch (e) {
      console.error('Local DB Init Error:', e);
      throw new Error('Local SQLite is not available in this environment.');
    }
  }

  prepare(sql: string) {
    // Return a proxy to keep the prepare API synchronous for the caller
    // but the actual execution will wait for initialization
    return {
      run: async (...params: any[]) => {
        await this.ensureInitialized();
        return this.db.prepare(sql).run(...params);
      },
      get: async (...params: any[]) => {
        await this.ensureInitialized();
        return this.db.prepare(sql).get(...params);
      },
      all: async (...params: any[]) => {
        await this.ensureInitialized();
        return this.db.prepare(sql).all(...params);
      },
    };
  }

  async exec(sql: string) {
    await this.ensureInitialized();
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
      all: (...params: any[]) => stmt.bind(...params).all().then((r: any) => r.results),
    };
  }
  async exec(sql: string) {
    await this.d1.exec(sql);
  }
}

let dbInstance: DBClient | null = null;

export function getDB(): DBClient {
  const env = getCloudEnv();
  // If we have D1, ALWAYS use it.
  if (env && env.ART_GALLERY_DB) {
    if (!(dbInstance instanceof D1Client)) {
      dbInstance = new D1Client(env.ART_GALLERY_DB);
    }
    return dbInstance;
  }
  
  // Otherwise fallback to local
  if (!dbInstance) {
    dbInstance = new LocalDB();
  }
  return dbInstance;
}

// Initializing tables
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

export const db = getDB();
export default db;
