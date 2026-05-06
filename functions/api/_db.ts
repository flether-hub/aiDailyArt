import { getCloudEnv } from './_cloud-env';

export interface DBClient {
  prepare(sql: string): {
    run(...params: any[]): Promise<any>;
    get(...params: any[]): Promise<any>;
    all(...params: any[]): Promise<any[]>;
  };
  exec(sql: string): Promise<void>;
}

class SQLiteClient implements DBClient {
  constructor(private db: any) {}
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...params: any[]) => stmt.run(...params),
      get: async (...params: any[]) => stmt.get(...params),
      all: async (...params: any[]) => {
          return stmt.all(...params);
      },
    };
  }
  async exec(sql: string) {
    this.db.exec(sql);
  }
}

class D1Client implements DBClient {
  constructor(private d1: any) {}
  prepare(sql: string) {
    const stmt = this.d1.prepare(sql);
    return {
      run: async (...params: any[]) => {
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        return await bound.run();
      },
      get: async (...params: any[]) => {
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        return await bound.first();
      },
      all: async (...params: any[]) => {
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        const res = await bound.all();
        return res.results || [];
      }
    };
  }
  async exec(sql: string) {
    await this.d1.exec(sql);
  }
}

let dbInstance: DBClient | null = null;

export async function getDB(): Promise<DBClient> {
  if (!dbInstance) {
    const env = getCloudEnv();
    
    // Check for Cloudflare D1
    if (env && env.ART_GALLERY_DB) {
      console.log('Using Cloudflare D1 Database');
      dbInstance = new D1Client(env.ART_GALLERY_DB);
      return dbInstance;
    }
    
    // Check for Node.js environment (Local / AI Studio Preview)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      console.log('Detected Node.js environment, using local SQLite');
      try {
        // Dynamic require to avoid Cloudflare/esbuild bundling node built-ins and native modules
        let req: any;
        try {
          req = eval('require');
        } catch (e) {
          const mod = await import('node:module');
          req = mod.createRequire(import.meta.url);
        }
        
        const Database = req('better-sqlite3');
        const path = req('path');
        const dbPath = path.resolve(process.cwd(), 'database.sqlite');
        const db = new Database(dbPath);
        dbInstance = new SQLiteClient(db);
        return dbInstance;
      } catch (e) {
        console.error('Failed to load local SQLite (better-sqlite3):', e);
        // Fall through to error if we can't find a DB
      }
    }
    
    const isCloudflare = typeof (globalThis as any).caches !== 'undefined';
    if (isCloudflare) {
       console.error('DATABASE ERROR: No D1 binding found. Configure a D1 binding named ART_GALLERY_DB in Cloudflare dashboard.');
       throw new Error('Cloudflare D1 数据库未绑定。请在 Cloudflare Pages 设置中添加名为 ART_GALLERY_DB 的 D1 绑定。');
    }

    throw new Error('无法连接到数据库。如果是在本地运行，请确保已安装 better-sqlite3。如果是在 Cloudflare，请检查 D1 绑定。');
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

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS banned_ips (
      ip_address TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      artwork_id TEXT,
      content TEXT,
      ip_address TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(artwork_id) REFERENCES artworks(id)
    )
  `).run();
  
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS visitor_stats (
      id TEXT PRIMARY KEY,
      ip_address TEXT,
      location TEXT,
      device_type TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // PRAGMA is not supported in D1, and migration is only needed for legacy SQLite files
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  if (isNode) {
    try {
      const tableInfo = await db.prepare("PRAGMA table_info(comments)").all();
      const hasLocation = Array.isArray(tableInfo) && tableInfo.some((col: any) => col.name === 'location');
      if (!hasLocation) {
        await db.prepare("ALTER TABLE comments ADD COLUMN location TEXT").run();
        console.log('Migrated comments: added location column');
      }
    } catch (e) {
      console.warn('Migration check failed (safe to ignore if columns exist):', e);
    }
  }
  
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  await insertSetting.run('ai_provider', 'gemini');
  await insertSetting.run('gemini_model_id', 'gemini-1.5-flash');
  await insertSetting.run('dashscope_model_id', 'qwen-max');
  await insertSetting.run('interval_hours', '0');
  await insertSetting.run('interval_minutes', '30');
  await insertSetting.run('enabled_auto_fetch', 'true');
}

export default {
  get instance() { return getDB(); }
};
