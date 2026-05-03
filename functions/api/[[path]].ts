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

// Protect all admin endpoints
app.use('/admin/*', async (c, next) => {
  const env = getCloudEnv();
  const expectedPassword = env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return c.json({ error: 'System configuration error: ADMIN_PASSWORD not set' }, 500);
  }
  
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token && token === expectedPassword) {
      return next();
    }
  }
  
  return c.json({ error: 'Unauthorized: invalid or missing admin token' }, 401);
});

app.get('/cron', async (c) => {
  const cronSecret = c.req.query('secret');
  const env = getCloudEnv();
  // Validates secret from environment variable (if set), to protect the endpoint
  if (env.CRON_SECRET && cronSecret !== env.CRON_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Record the trigger time
  try {
    const db = await getDB();
    const nowIso = new Date().toISOString();
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cron_last_trigger', nowIso);
  } catch (err) {
    console.error('Error saving cron_last_trigger:', err);
  }

  // Asynchronous execution without blocking the response
  const promise = (async () => {
    try {
      const { runAIAggregation } = await import('./_ai-fetcher');
      await runAIAggregation(false);
      console.log('[Cron] Aggregation finished.');
    } catch (err) {
      console.error('[Cron] Error running aggregation:', err);
    }
  })();
  
  try {
    c.executionCtx.waitUntil(promise);
  } catch (e) {
    // Non-Cloudflare environment, no waitUntil available
  }

  return c.json({ success: true, message: 'Cron job initiated in the background.' });
});

app.get('/admin/artworks', async (c) => {
  const db = await getDB();
  const limit = parseInt(c.req.query('limit') || '12', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  
  const artworks = await db.prepare('SELECT * FROM artworks ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  const totalResult = (await db.prepare('SELECT COUNT(*) as total FROM artworks').get()) as any;
  const total = totalResult?.total || 0;

  const processedArtworks = (Array.isArray(artworks) ? artworks : []).map((item: any) => ({
    ...item,
    keywords: typeof item.keywords === 'string' ? item.keywords.split(/[，,]/).map((k: string) => k.trim()) : (Array.isArray(item.keywords) ? item.keywords : [])
  }));

  return c.json({ data: processedArtworks, total });
});

app.get('/artworks', async (c) => {
  const db = await getDB();
  const keyword = c.req.query('keyword');
  const limit = parseInt(c.req.query('limit') || '12', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let artworks;
  let totalResult;
  let total = 0;
  
  if (keyword) {
    artworks = await db.prepare('SELECT * FROM artworks WHERE is_visible = 1 AND keywords LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(`%${keyword}%`, limit, offset);
    totalResult = (await db.prepare('SELECT COUNT(*) as total FROM artworks WHERE is_visible = 1 AND keywords LIKE ?').get(`%${keyword}%`)) as any;
  } else {
    artworks = await db.prepare('SELECT * FROM artworks WHERE is_visible = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
    totalResult = (await db.prepare('SELECT COUNT(*) as total FROM artworks WHERE is_visible = 1').get()) as any;
  }

  total = totalResult?.total || 0;

  const processedArtworks = (Array.isArray(artworks) ? artworks : []).map((item: any) => ({
    ...item,
    keywords: typeof item.keywords === 'string' ? item.keywords.split(/[，,]/).map((k: string) => k.trim()) : (Array.isArray(item.keywords) ? item.keywords : [])
  }));

  return c.json({ data: processedArtworks, total });
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
  
  // Increment view count
  const incrementPromise = db.prepare('UPDATE artworks SET views = views + 1 WHERE id = ?').run(id).catch(console.error);
  
  try {
    c.executionCtx.waitUntil(incrementPromise);
  } catch (e) {
    // If not in Cloudflare, we can await or just let it finish in Node's background
    await incrementPromise;
  }
  
  return c.json(processedArtwork);
});

app.delete('/admin/artworks/:id', async (c) => {
  const db = await getDB();
  const id = c.req.param('id');
  await db.prepare('DELETE FROM artworks WHERE id = ?').run(id);
  return c.json({ success: true });
});

app.post('/admin/artworks/:id/reinterpret', async (c) => {
  const { stream } = await import('hono/streaming');
  return stream(c, async (stream) => {
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    
    let isStreamClosed = false;
    stream.onAbort(() => {
      isStreamClosed = true;
    });

    const task = async () => {
      try {
        const db = await getDB();
        const id = c.req.param('id');
        const artwork = await db.prepare('SELECT * FROM artworks WHERE id = ?').get(id) as any;
        if (!artwork) {
           if (!isStreamClosed) {
               try { await stream.write(JSON.stringify({ type: 'complete', data: { success: false, message: 'not found' } }) + '\n'); } catch(e){}
           }
           return;
        }

        const getSetting = async (key: string) => await db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
        const provider = (await getSetting('ai_provider'))?.value || 'gemini';
        const modelId = (await getSetting('model_id'))?.value;
        let apiKey = (await getSetting('api_key'))?.value;
        if (!apiKey && typeof process !== 'undefined' && process.env.GEMINI_API_KEY) {
          apiKey = process.env.GEMINI_API_KEY;
        }

        const { generateDetailedInterpretation } = await import('./_ai-fetcher');
        
        const notify = async (msg: string, isError: boolean = false) => {
           if (!isStreamClosed) {
               try { await stream.write(JSON.stringify({ type: 'progress', message: msg, error: isError }) + '\n'); } catch(e) { isStreamClosed = true; }
           }
        };

        const aiData = await generateDetailedInterpretation(artwork.title, artwork.artist, artwork.year, provider, modelId, apiKey, notify);

        const titleZh = aiData.title_zh && aiData.title_zh !== '中文译名' ? aiData.title_zh : artwork.title;
        const artistZh = aiData.artist_zh && aiData.artist_zh !== '中文画家名' ? aiData.artist_zh : artwork.artist;

        const keywordsStr = Array.isArray(aiData.keywords) ? aiData.keywords.join(', ') : String(aiData.keywords || '');
        
        await db.prepare(`
          UPDATE artworks SET ai_interpretation = ?, keywords = ?, title = ?, artist = ? WHERE id = ?
        `).run(aiData.content, keywordsStr, titleZh, artistZh, id);

        if (!isStreamClosed) {
            try { await stream.write(JSON.stringify({ type: 'complete', data: { success: true, ai_interpretation: aiData.content, keywords: keywordsStr, title: titleZh, artist: artistZh } }) + '\n'); } catch(e) {}
        }
      } catch(err: any) {
        if (!isStreamClosed) {
            try { await stream.write(JSON.stringify({ type: 'complete', data: { success: false, message: err.message } }) + '\n'); } catch(e) {}
        }
      }
    };
    
    const promise = task();
    try {
      c.executionCtx.waitUntil(promise);
    } catch (e) {
      // Non-Cloudflare environment
    }
    await promise;
  });
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
  
  // Get total artworks count
  const countResult = await db.prepare('SELECT count(*) as count FROM artworks').get();
  const artworksCount = (countResult as any)?.count || 0;
  
  // Get sum of all artwork views
  const viewsResult = await db.prepare('SELECT sum(views) as total_views FROM artworks').get();
  const totalArtworkViews = (viewsResult as any)?.total_views || 0;
  
  // Get site visits from settings
  const visitResult = await db.prepare('SELECT value FROM settings WHERE key = ?').get('site_visits');
  const siteVisits = parseInt((visitResult as any)?.value || '0', 10);
  
  return c.json({ 
    artworks: artworksCount, 
    visits: siteVisits + totalArtworkViews 
  }); 
});

app.post('/stats/visit', async (c) => {
  const db = await getDB();
  const incrementPromise = (async () => {
    try {
      const current = await db.prepare('SELECT value FROM settings WHERE key = ?').get('site_visits');
      const newValue = parseInt((current as any)?.value || '0', 10) + 1;
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('site_visits', String(newValue));
    } catch (e) {
      console.error('Failed to increment site visits:', e);
    }
  })();

  try {
    c.executionCtx.waitUntil(incrementPromise);
  } catch (e) {
    await incrementPromise;
  }

  return c.json({ success: true });
});

app.get('/keywords', async (c) => {
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
    .slice(0, 20)
    .map(entry => entry[0]);
  return c.json(sortedKeywords);
});

app.post('/auth/login', async (c) => {
  const { password } = await c.req.json();
  const env = getCloudEnv();
  const expectedPassword = env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return c.json({ success: false, error: '系统未配置管理员密码' }, 500);
  }

  if (password === expectedPassword) {
    return c.json({ success: true, token: expectedPassword }); 
  }
  return c.json({ success: false, error: '密码错误' }, 401);
});

app.get('/auth/check', async (c) => {
  const env = getCloudEnv();
  const expectedPassword = env.ADMIN_PASSWORD;

  const token = c.req.header('Authorization')?.split(' ')[1];
  if (expectedPassword && token && token === expectedPassword) {
    return c.json({ isAdmin: true });
  }
  return c.json({ isAdmin: false });
});

app.get('/admin/settings', async (c) => {
  const db = await getDB();
  const settings = await db.prepare('SELECT * FROM settings').all();
  const result: any = {};
  (settings || []).forEach((s: any) => {
    if (s.key === 'api_key' && s.value) {
      // Mask the actual API key to prevent it from leaking in preview mode
      result[s.key] = '********' + s.value.slice(-4);
    } else {
      result[s.key] = s.value;
    }
  });
  return c.json(result);
});

app.post('/admin/settings', async (c) => {
  const db = await getDB();
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    // Prevent overriding with the masked value
    if (key === 'api_key' && typeof value === 'string' && value.startsWith('********')) {
      continue;
    }
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
    
    let isStreamClosed = false;
    stream.onAbort(() => {
      isStreamClosed = true;
    });
    
    const task = async () => {
      try {
        await runAIAggregation(true, async (msg, isError) => {
           if (!isStreamClosed) {
             try { await stream.write(JSON.stringify({ type: 'progress', message: msg, error: isError }) + '\n'); } 
             catch(e) { isStreamClosed = true; }
           }
        });
        const db = await getDB();
        const result = await db.prepare("SELECT count(*) as c FROM artworks WHERE date(created_at) = date('now')").get();
        const newlyAdded = (result as any)?.c || 0;
        if (!isStreamClosed) {
          try { await stream.write(JSON.stringify({ type: 'complete', data: { success: true, message: `分析任务已圆满完成。`, count: newlyAdded } }) + '\n'); } 
          catch(e) {}
        }
      } catch (err: any) {
        console.error('Streaming API Error:', err);
        if (!isStreamClosed) {
          try { await stream.write(JSON.stringify({ type: 'complete', data: { success: false, message: `流处理异常: ${err.message}` } }) + '\n'); } 
          catch(e) {}
        }
      }
    };
    
    const promise = task();
    try {
      c.executionCtx.waitUntil(promise);
    } catch (e) {
      // Non-Cloudflare environment
    }
    // we don't await promise here so if client disconnects stream is closed but waitUntil keeps promise alive.
    // wait, stream function expects us to await if we want to keep it open
    await promise;
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
export default app;
