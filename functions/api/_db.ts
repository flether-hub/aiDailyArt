import Database from 'better-sqlite3';
import path from 'path';

export interface DBClient {
  prepare(sql: string): {
    run(...params: any[]): Promise<any>;
    get(...params: any[]): Promise<any>;
    all(...params: any[]): Promise<any[]>;
  };
  exec(sql: string): Promise<void>;
}

class SQLiteClient implements DBClient {
  constructor(private db: Database.Database) {}
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...params: any[]) => stmt.run(...params),
      get: async (...params: any[]) => stmt.get(...params),
      all: async (...params: any[]) => {
          // Fix for Better-sqlite returning objects instead of .results wrapping
          return stmt.all(...params);
      },
    };
  }
  async exec(sql: string) {
    this.db.exec(sql);
  }
}

let dbInstance: DBClient | null = null;

export async function getDB(): Promise<DBClient> {
  if (!dbInstance) {
    const dbPath = path.resolve(process.cwd(), 'database.sqlite');
    const db = new Database(dbPath);
    dbInstance = new SQLiteClient(db);
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
