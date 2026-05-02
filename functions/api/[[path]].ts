import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { getDB, initDB } from './_db';
import { runAIAggregation } from './_ai-fetcher';
import { setCloudEnv, getCloudEnv } from './_cloud-env';

const app = new Hono<any>().basePath('/api');

let dbInitialized = false;

app.use('*', async (c, next) => {
  setCloudEnv(c.env);
  
  if (!dbInitialized) {
    try {
      const db = await getDB();
      await initDB(db);
      dbInitialized = true;
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
  }
  
  await next();
});

app.use('*', cors());

app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: err.message || 'Internal Server Error'
  }, 500);
});

// Explicit health check
app.get('/health', (c) => c.json({ status: 'ok', environment: 'cloudflare' }));

app.get('/artworks', async (c) => {
  const db = await getDB();
  const keyword = c.req.query('keyword');
  const limit = parseInt(c.req.query('limit') || '12', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

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

  return c.json(processedArtworks);
});

app.get('/artworks/:id', async (c) => {
  const db = await getDB();
  const id = c.req.param('id');
  const artwork = await db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
  
  if (!artwork) return c.json({ error: '未找到该艺术品' }, 404);
  
  const processedArtwork = {
    ...artwork,
    keywords: typeof artwork.keywords === 'string' ? artwork.keywords.split(/[，,]/).map((k: string) => k.trim()) : (Array.isArray(artwork.keywords) ? artwork.keywords : [])
  };
  
  // Increment view count (async)
  db.prepare('UPDATE artworks SET views = views + 1 WHERE id = ?').run(id).catch(console.error);
  
  return c.json(processedArtwork);
});

app.delete('/admin/artworks/:id', async (c) => {
  const db = await getDB();
  const id = c.req.param('id');
  await db.prepare('DELETE FROM artworks WHERE id = ?').run(id);
  return c.json({ success: true });
});

app.post('/admin/artworks/:id/reinterpret', async (c) => {
  const db = await getDB();
  const id = c.req.param('id');
  const artwork = await db.prepare('SELECT * FROM artworks WHERE id = ?').get(id) as any;
  if (!artwork) return c.json({ error: 'not found' }, 404);

  const getSetting = (key: string) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  const provider = (await getSetting('ai_provider'))?.value || 'gemini';
  const modelId = (await getSetting('model_id'))?.value;
  const apiKey = (await getSetting('api_key'))?.value;

  const { generateDetailedInterpretation } = await import('./_ai-fetcher');
  const aiData = await generateDetailedInterpretation(artwork.title, artwork.artist, artwork.year, provider, modelId, apiKey);

  const titleZh = aiData.title_zh && aiData.title_zh !== '中文译名' ? aiData.title_zh : artwork.title;
  const artistZh = aiData.artist_zh && aiData.artist_zh !== '中文画家名' ? aiData.artist_zh : artwork.artist;

  await db.prepare(`
    UPDATE artworks SET ai_interpretation = ?, keywords = ?, title = ?, artist = ? WHERE id = ?
  `).run(aiData.content, aiData.keywords, titleZh, artistZh, id);

  return c.json({ success: true, ai_interpretation: aiData.content, keywords: aiData.keywords, title: titleZh, artist: artistZh });
});

app.post('/admin/artworks/bulk-delete', async (c) => {
  const db = await getDB();
  const { ids } = await c.req.json();
  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`DELETE FROM artworks WHERE id IN (${placeholders})`).run(...ids);
  }
  return c.json({ success: true });
});

app.get('/stats', async (c) => {
  const db = await getDB();
  const countResult = await db.prepare('SELECT count(*) as count FROM artworks').get();
  const count = (countResult as any)?.count || 0;
  return c.json({ artworks: count, visits: 1337 + count * 4 }); 
});

app.post('/stats/visit', async (c) => {
  return c.json({ success: true });
});

app.get('/keywords', async (c) => {
  const db = await getDB();
  const results = await db.prepare('SELECT keywords FROM artworks').all();
  const fetchedResults = Array.isArray(results) ? results : [];
  const keywordSet = new Set<string>();
  fetchedResults.forEach((row: any) => {
    if (row.keywords) {
      row.keywords.split(/[，,]/).forEach((k: string) => {
        const trimmed = k.trim();
        if (trimmed) keywordSet.add(trimmed);
      });
    }
  });
  return c.json(Array.from(keywordSet).slice(0, 50));
});

app.post('/auth/login', async (c) => {
  const { password } = await c.req.json();
  const env = getCloudEnv();
  
  if (password === env.ADMIN_PASSWORD) {
    return c.json({ success: true, token: 'secret-token' }); 
  }
  return c.json({ success: false, error: '密码错误' }, 401);
});

app.get('/auth/check', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (token === 'secret-token') {
    return c.json({ isAdmin: true });
  }
  return c.json({ isAdmin: false });
});

app.get('/admin/settings', async (c) => {
  const db = await getDB();
  const settings = await db.prepare('SELECT * FROM settings').all();
  const result: any = {};
  (settings || []).forEach((s: any) => result[s.key] = s.value);
  return c.json(result);
});

app.post('/admin/settings', async (c) => {
  const db = await getDB();
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
  return c.json({ success: true });
});

app.post('/admin/trigger-fetch', async (c) => {
  const { stream } = await import('hono/streaming');
  return stream(c, async (stream) => {
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    
    try {
      await runAIAggregation(true, async (msg, isError) => {
         await stream.write(JSON.stringify({ type: 'progress', message: msg, error: isError }) + '\n');
      });
      // Send final summary
      const db = await getDB();
      const result = await db.prepare("SELECT count(*) as c FROM artworks WHERE date(created_at) = date('now')").get();
      const newlyAdded = (result as any)?.c || 0;
      await stream.write(JSON.stringify({ type: 'complete', data: { success: true, message: `分析任务已圆满完成。`, count: newlyAdded } }) + '\n');
    } catch (err: any) {
      console.error('Streaming API Error:', err);
      await stream.write(JSON.stringify({ type: 'complete', data: { success: false, message: `流处理异常: ${err.message}` } }) + '\n');
    }
  });
});

// Proxy for R2 images
app.get('/cdn/*', async (c) => {
  const env = getCloudEnv();
  const path = c.req.path.replace('/api/cdn/', '');
  
  if (!env || !env.ART_GALLERY_IMAGES) return c.status(404);
  
  const object = await env.ART_GALLERY_IMAGES.get(path);
  if (!object) return c.status(404);
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  return new Response(object.body, { headers });
});

export const onRequest = handle(app);
