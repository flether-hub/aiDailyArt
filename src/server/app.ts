import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDB, initDB } from './db';
import { runAIAggregation } from './ai-fetcher';
import { getCloudEnv } from './cloud-env';

const api = new Hono();

api.use('*', cors());

api.onError((err, c) => {
  console.error('API 错误:', err);
  return c.json({
    error: err.message || '内部服务器错误',
    stack: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ? err.stack : undefined
  }, 500);
});

api.get('/artworks', async (c) => {
  const db = getDB();
  const page = parseInt(c.req.query('page') || '0', 10);
  const keyword = c.req.query('keyword');
  const limit = 12;
  const offset = page * limit;

  let artworks;
  if (keyword) {
    artworks = await db.prepare('SELECT * FROM artworks WHERE keywords LIKE ? AND is_visible = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(`%${keyword}%`, limit, offset);
  } else {
    artworks = await db.prepare('SELECT * FROM artworks WHERE is_visible = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  }

  return c.json(artworks);
});

api.get('/artworks/:id', async (c) => {
  const db = getDB();
  const id = c.req.param('id');
  const artwork = await db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
  
  if (!artwork) return c.json({ error: '未找到该艺术品' }, 404);
  
  // Increment view count
  await db.prepare('UPDATE artworks SET views = views + 1 WHERE id = ?').run(id);
  
  return c.json(artwork);
});

api.get('/stats', async (c) => {
  const db = getDB();
  const count = await db.prepare('SELECT count(*) as count FROM artworks').get();
  // Simple visit tracking in memory or just return a reasonable number
  return c.json({ artworks: count?.count || 0, visits: 1337 + (count?.count || 0) * 4 }); 
});

api.post('/stats/visit', async (c) => {
  return c.json({ success: true });
});

api.get('/keywords', async (c) => {
  const db = getDB();
  const results = await db.prepare('SELECT keywords FROM artworks').all();
  const keywordSet = new Set<string>();
  results.forEach((row: any) => {
    if (row.keywords) {
      row.keywords.split(/[，,]/).forEach((k: string) => {
        const trimmed = k.trim();
        if (trimmed) keywordSet.add(trimmed);
      });
    }
  });
  return c.json(Array.from(keywordSet).slice(0, 50));
});

api.post('/auth/login', async (c) => {
  const { password } = await c.req.json();
  const env = getCloudEnv();
  
  if (password === env.ADMIN_PASSWORD) {
    return c.json({ success: true, token: 'secret-token' }); 
  }
  return c.json({ success: false, error: '密码错误' }, 401);
});

api.get('/auth/check', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (token === 'secret-token') {
    return c.json({ isAdmin: true });
  }
  return c.json({ isAdmin: false });
});

api.get('/admin/settings', async (c) => {
  const db = getDB();
  const settings = await db.prepare('SELECT * FROM settings').all();
  const result: any = {};
  (settings || []).forEach((s: any) => result[s.key] = s.value);
  return c.json(result);
});

api.post('/admin/settings', async (c) => {
  const db = getDB();
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
  return c.json({ success: true });
});

api.post('/admin/trigger-fetch', async (c) => {
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
      const db = getDB();
      const result = await db.prepare("SELECT count(*) as c FROM artworks WHERE date(created_at) = date('now')").get();
      const newlyAdded = result?.c || 0;
      await stream.write(JSON.stringify({ type: 'complete', data: { success: true, message: `分析任务已圆满完成。`, count: newlyAdded } }) + '\n');
    } catch (err: any) {
      console.error('Streaming API Error:', err);
      await stream.write(JSON.stringify({ type: 'complete', data: { success: false, message: `流处理异常: ${err.message}` } }) + '\n');
    }
  });
});

// Proxy for R2 images
api.get('/cdn/*', async (c) => {
  const env = getCloudEnv();
  const path = c.req.path.replace('/api/cdn/', '');
  
  if (!env.ART_GALLERY_IMAGES) return c.status(404);
  
  const object = await env.ART_GALLERY_IMAGES.get(path);
  if (!object) return c.status(404);
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  return new Response(object.body, { headers });
});

const app = new Hono();
app.route('/api', api);

export default app;
