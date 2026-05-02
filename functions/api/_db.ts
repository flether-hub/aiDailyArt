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
    if (env && env.ART_GALLERY_DB) {
      dbInstance = new D1Client(env.ART_GALLERY_DB);
      return dbInstance;
    }
    
    if (typeof process !== 'undefined' && process.env) {
      // Dynamic require to avoid Cloudflare/esbuild bundling node built-ins and native modules
      let req = typeof require !== 'undefined' ? require : undefined;
      if (!req) {
         const moduleName = 'mo' + 'dule';
         const mod = await import(moduleName /* webpackIgnore: true */ as any);
         req = mod.createRequire(import.meta.url);
      }
      const Database = req('better-' + 'sqlite3');
      const path = req('pa' + 'th');
      const dbPath = path.resolve(process.cwd(), 'database.sqlite');
      const db = new Database(dbPath);
      dbInstance = new SQLiteClient(db);
    } else {
      throw new Error('No database found. Configure D1 binding ART_GALLERY_DB.');
    }
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
  await insertSetting.run('interval_hours', '0');
  await insertSetting.run('interval_minutes', '30');
}

export default {
  get instance() { return getDB(); }
};
