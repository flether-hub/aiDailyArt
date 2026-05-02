import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { getDB, initDB } from './functions/api/_db.js';
import { runAIAggregation } from './functions/api/_ai-fetcher.js';

const app = express();
const PORT = 3000;

app.use(express.json());

let dbInitialized = false;

app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      const db = await getDB();
      await initDB(db);
      dbInitialized = true;
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
  }
  next();
});

// Explicit health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', environment: 'express' }));

app.get('/api/artworks', async (req, res) => {
  const db = await getDB();
  const keyword = req.query.keyword as string;
  const limit = parseInt(req.query.limit as string || '12', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  let artworks;
  if (keyword) {
    artworks = await db.prepare('SELECT * FROM artworks WHERE is_visible = 1 AND keywords LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(`%${keyword}%`, limit, offset);
  } else {
    artworks = await db.prepare('SELECT * FROM artworks WHERE is_visible = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  }

  const processedArtworks = (Array.isArray(artworks) ? artworks : []).map((item: any) => ({
    ...item,
    keywords: typeof item.keywords === 'string' ? item.keywords.split(/[，,]/).map((k: string) => k.trim()) : (Array.isArray(item.keywords) ? item.keywords : [])
  }));

  res.json(processedArtworks);
});

app.get('/api/artworks/:id', async (req, res) => {
  const db = await getDB();
  const id = req.params.id;
  const artwork = await db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
  
  if (!artwork) return res.status(404).json({ error: '未找到该艺术品' });
  
  const processedArtwork = {
    ...artwork,
    keywords: typeof artwork.keywords === 'string' ? artwork.keywords.split(/[，,]/).map((k: string) => k.trim()) : (Array.isArray(artwork.keywords) ? artwork.keywords : [])
  };
  
  // Increment view count (async)
  db.prepare('UPDATE artworks SET views = views + 1 WHERE id = ?').run(id).catch(console.error);
  
  res.json(processedArtwork);
});

app.delete('/api/admin/artworks/:id', async (req, res) => {
  const db = await getDB();
  const id = req.params.id;
  await db.prepare('DELETE FROM artworks WHERE id = ?').run(id);
  res.json({ success: true });
});

app.post('/api/admin/artworks/:id/reinterpret', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const db = await getDB();
    const id = req.params.id;
    const artwork: any = await db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
    if (!artwork) {
      res.write(JSON.stringify({ type: 'complete', data: { success: false, message: '未找到该名画' } }) + '\n');
      return res.end();
    }

    const getSetting = async (key: string) => await db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    const provider = (await getSetting('ai_provider'))?.value || 'gemini';
    const modelId = (await getSetting('model_id'))?.value;
    let apiKey = (await getSetting('api_key'))?.value;
    if (!apiKey && typeof process !== 'undefined' && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    const { generateDetailedInterpretation } = await import('./functions/api/_ai-fetcher.ts');
    
    const notify = (msg: string, isError: boolean = false) => {
       res.write(JSON.stringify({ type: 'progress', message: msg, error: isError }) + '\n');
    };

    const aiData = await generateDetailedInterpretation(artwork.title, artwork.artist, artwork.year, provider, modelId, apiKey, notify);

    const titleZh = aiData.title_zh && aiData.title_zh !== '中文译名' ? aiData.title_zh : artwork.title;
    const artistZh = aiData.artist_zh && aiData.artist_zh !== '中文画家名' ? aiData.artist_zh : artwork.artist;

    const keywordsStr = Array.isArray(aiData.keywords) ? aiData.keywords.join(', ') : String(aiData.keywords || '');
    
    await db.prepare(`
      UPDATE artworks SET ai_interpretation = ?, keywords = ?, title = ?, artist = ? WHERE id = ?
    `).run(aiData.content, keywordsStr, titleZh, artistZh, id);

    res.write(JSON.stringify({ type: 'complete', data: { success: true, ai_interpretation: aiData.content, keywords: keywordsStr, title: titleZh, artist: artistZh } }) + '\n');
    res.end();
  } catch (err: any) {
    res.write(JSON.stringify({ type: 'complete', data: { success: false, message: err.message } }) + '\n');
    res.end();
  }
});

app.post('/api/admin/artworks/bulk-delete', async (req, res) => {
  const db = await getDB();
  const { ids } = req.body;
  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`DELETE FROM artworks WHERE id IN (${placeholders})`).run(...ids);
  }
  res.json({ success: true });
});

app.get('/api/stats', async (req, res) => {
  const db = await getDB();
  const countResult = await db.prepare('SELECT count(*) as count FROM artworks').get();
  const count = (countResult as any)?.count || 0;
  res.json({ artworks: count, visits: 1337 + count * 4 }); 
});

app.post('/api/stats/visit', async (req, res) => {
  res.json({ success: true });
});

app.get('/api/keywords', async (req, res) => {
  const db = await getDB();
  const results = await db.prepare('SELECT keywords FROM artworks').all();
  const fetchedResults = Array.isArray(results) ? results : [];
  const keywordCounts: Record<string, number> = {};
  fetchedResults.forEach((row: any) => {
    if (row.keywords) {
      row.keywords.split(/[，,]/).forEach((k: string) => {
        const trimmed = k.trim();
        if (trimmed) keywordCounts[trimmed] = (keywordCounts[trimmed] || 0) + 1;
      });
    }
  });
  const sortedKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(entry => entry[0]);
  res.json(sortedKeywords);
});

app.post('/api/admin/keywords/delete', async (req, res) => {
  const db = await getDB();
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: '缺失标签参数' });

  const results = await db.prepare('SELECT id, keywords FROM artworks WHERE keywords LIKE ?').all(`%${keyword}%`);
  const fetchedArtworks = Array.isArray(results) ? results : [];
  
  for (const artwork of fetchedArtworks) {
     if (artwork.keywords) {
       const existingKeywords = artwork.keywords.split(/[，,]/).map((k: string) => k.trim());
       const newKeywords = existingKeywords.filter((k: string) => k !== keyword);
       if (existingKeywords.length !== newKeywords.length) {
         await db.prepare('UPDATE artworks SET keywords = ? WHERE id = ?').run(newKeywords.join(','), artwork.id);
       }
     }
  }
  res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  const db = await getDB();
  const adminPwdResult = await db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  const adminPwd = (adminPwdResult as any)?.value || process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password === adminPwd) {
    return res.json({ success: true, token: 'secret-token' }); 
  }
  res.status(401).json({ success: false, error: '密码错误' });
});

app.get('/api/auth/check', async (req, res) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (token === 'secret-token') {
    return res.json({ isAdmin: true });
  }
  res.json({ isAdmin: false });
});

app.get('/api/admin/settings', async (req, res) => {
  const db = await getDB();
  const settings = await db.prepare('SELECT * FROM settings').all();
  const result: any = {};
  (settings || []).forEach((s: any) => result[s.key] = s.value);
  res.json(result);
});

app.post('/api/admin/settings', async (req, res) => {
  const db = await getDB();
  const body = req.body;
  for (const [key, value] of Object.entries(body)) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
  res.json({ success: true });
});

app.post('/api/admin/trigger-fetch', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    await runAIAggregation(true, async (msg, isError) => {
       res.write(JSON.stringify({ type: 'progress', message: msg, error: isError }) + '\n');
    });
    const db = await getDB();
    const result = await db.prepare("SELECT count(*) as c FROM artworks WHERE date(created_at) = date('now')").get();
    const newlyAdded = (result as any)?.c || 0;
    res.write(JSON.stringify({ type: 'complete', data: { success: true, message: `分析任务已圆满完成。`, count: newlyAdded } }) + '\n');
    res.end();
  } catch (err: any) {
    console.error('Streaming API Error:', err);
    res.write(JSON.stringify({ type: 'complete', data: { success: false, message: `流处理异常: ${err.message}` } }) + '\n');
    res.end();
  }
});

// Proxy for R2 images locally
app.get('/api/cdn/*all', async (req, res) => {
  res.status(404).send('CDN only available on Cloudflare');
});

// Vite middleware for development
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
