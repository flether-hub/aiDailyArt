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
      run: (...params: any[]) => stmt.bind(...params).run(),
      get: (...params: any[]) => stmt.bind(...params).first(),
      all: (...params: any[]) => stmt.bind(...params).all().then((r: any) => r.results),
    };
  }
  async exec(sql: string) {
    await this.d1.exec(sql);
  }
}

class LocalClient implements DBClient {
  private db: any;
  
  static async create() {
    const instance = new LocalClient();
    // Dynamic import to avoid bundling on Cloudflare
    const sqlite = (await import('better-sqlite3')).default;
    instance.db = new sqlite('local.db');
    return instance;
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

let dbInstance: DBClient | null = null;

export async function getDB(): Promise<DBClient> {
  const env = getCloudEnv();
  
  if (!env || !env.ART_GALLERY_DB) {
    if (!dbInstance) {
      dbInstance = await LocalClient.create();
    }
    return dbInstance;
  }

  if (!(dbInstance instanceof D1Client)) {
    dbInstance = new D1Client(env.ART_GALLERY_DB);
  }
  
  return dbInstance;
}

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
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.exec(schema);
  
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  await insertSetting.run('ai_provider', 'gemini');
  await insertSetting.run('model_id', 'gemini-2.0-flash');
  await insertSetting.run('daily_limit', '1');
}

export const dbProxy = {
  get instance() { return getDB(); }
};

export default dbProxy;
