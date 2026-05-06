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

// Helper to generate a secure hash of the password to use as token
async function generateToken(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'art-gallery-v1'); // Internal salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Protect all admin endpoints
app.use('/admin/*', async (c, next) => {
  const env = getCloudEnv();
  const expectedPassword = env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return c.json({ error: 'System configuration error: ADMIN_PASSWORD not set' }, 500);
  }

  const expectedToken = await generateToken(expectedPassword);
  
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token && token === expectedToken) {
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

  const sort = c.req.query('sort') || 'latest';
  let artworks;
  let totalResult;
  let total = 0;
  
  let queryBase = 'SELECT a.*';
  let fromBase = 'FROM artworks a';
  let whereBase = 'WHERE a.is_visible = 1';
  let params: any[] = [];
  let orderStr = 'ORDER BY a.created_at DESC';

  if (sort === 'oldest') {
    orderStr = 'ORDER BY a.created_at ASC';
  } else if (sort === 'views' || sort === 'views_desc') {
    orderStr = 'ORDER BY a.views DESC, a.created_at DESC';
  } else if (sort === 'views_asc') {
    orderStr = 'ORDER BY a.views ASC, a.created_at DESC';
  } else if (sort === 'comments_desc') {
    queryBase = 'SELECT a.*, COUNT(c.id) as comments_count';
    fromBase = 'FROM artworks a LEFT JOIN comments c ON a.id = c.artwork_id';
    orderStr = 'GROUP BY a.id ORDER BY comments_count DESC, a.created_at DESC';
  } else if (sort === 'comments_asc') {
    queryBase = 'SELECT a.*, COUNT(c.id) as comments_count';
    fromBase = 'FROM artworks a LEFT JOIN comments c ON a.id = c.artwork_id';
    orderStr = 'GROUP BY a.id ORDER BY comments_count ASC, a.created_at DESC';
  }

  if (keyword) {
    whereBase += ' AND a.keywords LIKE ?';
    params.push(`%${keyword}%`);
  }

  const query = `${queryBase} ${fromBase} ${whereBase} ${orderStr} LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) as total FROM artworks a ${keyword ? 'WHERE a.is_visible = 1 AND a.keywords LIKE ?' : 'WHERE a.is_visible = 1'}`;

  artworks = await db.prepare(query).all(...params, limit, offset);
  totalResult = (await db.prepare(countQuery).get(...(keyword ? [`%${keyword}%`] : []))) as any;

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

app.get('/artworks/:id/similar', async (c) => {
  const db = await getDB();
  const id = c.req.param('id');
  
  try {
    const artwork = await db.prepare('SELECT id, keywords FROM artworks WHERE id = ?').get(id) as any;
    if (!artwork) return c.json({ data: [] });
    
    const currentKeywords = typeof artwork.keywords === 'string' 
      ? artwork.keywords.split(/[，,]/).map((k: string) => k.trim()).filter(Boolean)
      : [];

    const allArtworks = await db.prepare('SELECT * FROM artworks WHERE id != ? AND is_visible = 1').all(id);
    // Cloudflare D1 may return { results: [] } or just [] depending on the driver version
    const artworksArray = Array.isArray(allArtworks) ? allArtworks : ((allArtworks as any)?.results || []);

    if (!artworksArray || artworksArray.length === 0) {
      return c.json({ data: [] });
    }

    if (currentKeywords.length === 0) {
      // If no keywords, return latest 10
      const fallback = [...artworksArray]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      return c.json({ data: fallback });
    }

    const scored = artworksArray.map((art: any) => {
      const artKeywords = typeof art.keywords === 'string' 
        ? art.keywords.split(/[，,]/).map((k: string) => k.trim()).filter(Boolean)
        : [];
      
      let score = 0;
      for (const kw of currentKeywords) {
        if (artKeywords.includes(kw)) score++;
      }
      return { ...art, score };
    });

    const similar = scored
      .filter(art => art.score > 0)
      .sort((a, b) => b.score - a.score || b.views - a.views)
      .slice(0, 10);

    if (similar.length < 10) {
      const existingIds = new Set([id, ...similar.map(s => s.id)]);
      const latest = artworksArray
        .filter((art: any) => !existingIds.has(art.id))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10 - similar.length);
      
      return c.json({ data: [...similar, ...latest] });
    }

    return c.json({ data: similar });
  } catch (err) {
    console.error('Similar API Error:', err);
    return c.json({ data: [] });
  }
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
        const modelId = (await getSetting(`${provider}_model_id`))?.value || (await getSetting('model_id'))?.value;
        const apiKey = (await getSetting(`${provider}_api_key`))?.value || (await getSetting('api_key'))?.value;

        // Log for debugging (masked)
        const maskedKey = apiKey ? (apiKey.length > 8 ? apiKey.slice(0, 4) + '...' + apiKey.slice(-4) : '***') : 'NONE';
        console.log(`[Reinterpret] Using provider: ${provider}, model: ${modelId}, key: ${maskedKey}`);

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

app.get('/admin/job-status', async (c) => {
  const db = await getDB();
  const statusRes = await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_status');
  const messageRes = await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_message');
  const errorRes = await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_error');
  const updatedRes = await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_updated_at');

  let status = (statusRes as any)?.value || 'idle';
  const updatedAtStr = (updatedRes as any)?.value;
  
  if (status === 'running' && updatedAtStr) {
    const updatedAt = new Date(updatedAtStr).getTime();
    if (Date.now() - updatedAt > 3 * 60 * 1000) { // 3 minutes timeout
      status = 'idle';
    }
  }

  return c.json({
    status,
    message: (messageRes as any)?.value || '',
    error: (errorRes as any)?.value === 'true'
  });
});

app.post('/admin/job-reset', async (c) => {
  const db = await getDB();
  await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_status', 'idle');
  await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_message', '已手动重置');
  await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_error', 'false');
  await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_updated_at', new Date().toISOString());
  return c.json({ success: true });
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

app.post('/admin/keywords/delete', async (c) => {
  const db = await getDB();
  const { keyword } = await c.req.json();
  if (!keyword) return c.json({ error: 'Keyword is required' }, 400);

  const artworks = await db.prepare("SELECT id, keywords FROM artworks WHERE keywords LIKE ?")
    .all(`%${keyword}%`);

  const fetchedArtworks = Array.isArray(artworks) ? artworks : [];
  
  for (const artwork of fetchedArtworks) {
    if (!artwork.keywords) continue;
    const kwList = (artwork.keywords as string).split(/[，,]/).map((k: string) => k.trim());
    const newKwList = kwList.filter((k: string) => k !== keyword);
    
    if (kwList.length !== newKwList.length) {
      await db.prepare("UPDATE artworks SET keywords = ? WHERE id = ?").run(newKwList.join(', '), artwork.id);
    }
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
  const cf = (c.req.raw as any).cf;
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'Unknown';
  
  let country = cf?.country || 'Unknown';
  let region = cf?.region || 'Unknown';
  
  let formattedLocation = '其他地区';
  if (country === 'CN') {
    formattedLocation = region;
  } else if (country === 'HK') {
    formattedLocation = '香港';
  } else if (country === 'MO') {
    formattedLocation = '澳门';
  } else if (country === 'TW') {
    formattedLocation = '台湾';
  } else if (country !== 'Unknown') {
    formattedLocation = country;
  }
  
  let deviceType = 'Desktop';
  if (/mobile/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/tablet/i.test(ua) || /ipad/i.test(ua)) {
    deviceType = 'Tablet';
  }

  const statRecordPromise = (async () => {
    try {
      await db.prepare("INSERT INTO visitor_stats (id, ip_address, location, device_type) VALUES (?, ?, ?, ?)").run(crypto.randomUUID(), ip, formattedLocation, deviceType);
    } catch (e) {
      console.error('Failed to insert visitor_stats:', e);
    }
  })();

  const incrementPromise = (async () => {
    try {
      // Use atomic update to prevent race conditions
      await db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('site_visits', '0')").run();
      await db.prepare("UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'site_visits'").run();
    } catch (e) {
      console.error('Failed to increment site visits:', e);
    }
  })();

  try {
    c.executionCtx.waitUntil(Promise.all([incrementPromise, statRecordPromise]));
  } catch (e) {
    await Promise.all([incrementPromise, statRecordPromise]);
  }

  return c.json({ success: true });
});

app.get('/admin/visitor-stats', async (c) => {
  const db = await getDB();
  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  // Overview stats
  const totalVisitsRes = await db.prepare("SELECT COUNT(*) as count FROM visitor_stats").get();
  const totalVisits = (totalVisitsRes as any)?.count || 0;

  const devicesRes = await db.prepare("SELECT device_type, COUNT(*) as count FROM visitor_stats GROUP BY device_type").all();
  
  // Locations grouped and sorted by count descending
  const locationsRes = await db.prepare("SELECT location, COUNT(*) as count FROM visitor_stats GROUP BY location ORDER BY count DESC LIMIT ?, ?").all(offset, limit);
  const totalLocationsRes = await db.prepare("SELECT COUNT(DISTINCT location) as count FROM visitor_stats").get();
  const totalLocations = (totalLocationsRes as any)?.count || 0;

  return c.json({
    totalVisits,
    devices: devicesRes || [],
    locations: locationsRes || [],
    page,
    totalPages: Math.ceil(totalLocations / limit),
    totalLocations
  });
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
    .slice(0, 40)
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
    const token = await generateToken(expectedPassword);
    return c.json({ success: true, token }); 
  }
  return c.json({ success: false, error: '密码错误' }, 401);
});

app.get('/auth/check', async (c) => {
  const env = getCloudEnv();
  const expectedPassword = env.ADMIN_PASSWORD;

  if (!expectedPassword) return c.json({ isAdmin: false });

  const expectedToken = await generateToken(expectedPassword);
  const token = c.req.header('Authorization')?.split(' ')[1];
  
  if (token && token === expectedToken) {
    return c.json({ isAdmin: true });
  }
  return c.json({ isAdmin: false });
});

// Comment Routes
async function getIpLocation(ip: string): Promise<string> {
  // Take only the first IP if multiple are present
  const firstIp = ip.split(',')[0].trim();
  if (firstIp === '::1' || firstIp === '127.0.0.1') return '局域网';
  
  try {
    const response = await fetch(`http://ip-api.com/json/${firstIp}?lang=zh-CN`);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    if (data.status === 'success') {
      return `${data.country} ${data.regionName} ${data.city}`;
    }
  } catch (e) {
    console.error('IP geocoding failed', e);
  }
  return '位置未知';
}

app.get('/comments/:artworkId', async (c) => {
  const db = await getDB();
  const artworkId = c.req.param('artworkId');
  const comments = await db.prepare('SELECT * FROM comments WHERE artwork_id = ? ORDER BY created_at DESC')
    .all(artworkId);
    
  return c.json(comments || []);
});

app.post('/comments/:artworkId', async (c) => {
  const db = await getDB();
  const artworkId = c.req.param('artworkId');
  const { content } = await c.req.json();
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ error: '评论内容不能为空' }, 400);
  }

  const id = crypto.randomUUID();
  const rawIp = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'Unknown';
  const ip = rawIp.split(',')[0].trim();
  
  if (ip !== 'Unknown') {
    // Check if banned
    const banned = await db.prepare('SELECT 1 FROM banned_ips WHERE ip_address = ?').get(ip);
    if (banned) {
      return c.json({ error: '您的IP已被禁止评论。', errorCode: 'IP_BANNED' }, 403);
    }

    // Check artwork limit
    const artworkLimit = await db.prepare('SELECT COUNT(*) as count FROM comments WHERE artwork_id = ? AND ip_address = ?').get(artworkId, ip);
    if (artworkLimit && (artworkLimit as any).count >= 2) {
      return c.json({ error: '您在此画作下的评论次数已达上限 (最多2次)', errorCode: 'ARTWORK_LIMIT_EXCEEDED' }, 429);
    }
    
    // Check daily limit
    const dayLimit = await db.prepare("SELECT COUNT(*) as count FROM comments WHERE ip_address = ? AND created_at >= date('now')").get(ip);
    if (dayLimit && (dayLimit as any).count >= 10) {
      return c.json({ error: '您今日的评论次数已达上限 (每天最多10次)', errorCode: 'DAILY_LIMIT_EXCEEDED' }, 429);
    }
  }

  const now = new Date().toISOString();
  
  // Resolve location immediately on post to avoid hitting rate limits on every view
  const location = await getIpLocation(ip);

  await db.prepare('INSERT INTO comments (id, artwork_id, content, ip_address, location, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, artworkId, content.trim(), ip, location, now);

  return c.json({ success: true, id });
});

app.get('/admin/banned-ips', async (c) => {
  const db = await getDB();
  const banned = await db.prepare('SELECT ip_address FROM banned_ips').all();
  const ips = Array.isArray(banned) ? banned.map((b: any) => b.ip_address) : [];
  return c.json(ips);
});

app.post('/admin/banned-ips', async (c) => {
  const db = await getDB();
  const { ip_address } = await c.req.json();
  if (!ip_address) return c.json({ error: 'IP is required' }, 400);
  await db.prepare('INSERT OR IGNORE INTO banned_ips (ip_address) VALUES (?)').run(ip_address);
  return c.json({ success: true });
});

app.delete('/admin/banned-ips/:ip', async (c) => {
  const db = await getDB();
  const ip = c.req.param('ip');
  await db.prepare('DELETE FROM banned_ips WHERE ip_address = ?').run(ip);
  return c.json({ success: true });
});

app.delete('/admin/comments/:id', async (c) => {
  const db = await getDB();
  const id = c.req.param('id');
  await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  return c.json({ success: true });
});

app.post('/admin/comments/bulk-delete', async (c) => {
  const db = await getDB();
  const { ids } = await c.req.json();
  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`DELETE FROM comments WHERE id IN (${placeholders})`).run(...ids);
  }
  return c.json({ success: true });
});

app.get('/admin/settings', async (c) => {
  const db = await getDB();
  const settings = await db.prepare('SELECT * FROM settings').all();
  const result: any = {};
  (settings || []).forEach((s: any) => {
    if ((s.key === 'api_key' || s.key.endsWith('_api_key')) && s.value && s.value.length >= 8) {
      // Mask the actual API key to prevent it from leaking in preview mode
      const maskedValue = '*'.repeat(s.value.length - 4) + s.value.slice(-4);
      result[s.key] = maskedValue;
    } else {
      result[s.key] = s.value;
    }
  });
  return c.json(result);
});

app.get('/admin/comments', async (c) => {
  const db = await getDB();
  const comments = await db.prepare('SELECT c.*, a.title as artwork_title FROM comments c LEFT JOIN artworks a ON c.artwork_id = a.id ORDER BY created_at DESC').all();
  return c.json(comments || []);
});

app.post('/admin/settings', async (c) => {
  const db = await getDB();
  try {
    const body = await c.req.json();
    for (const [key, value] of Object.entries(body)) {
      // Skip helper keys for UI
      if (key.endsWith('Masked')) continue;
      
      // Prevent overriding with the masked value
      if ((key === 'api_key' || key.endsWith('_api_key')) && typeof value === 'string' && value.includes('***')) {
        console.log(`[Admin] Skipping masked API key for: ${key}`);
        continue;
      }
      
      if (key.includes('api_key')) {
        console.log(`[Admin] Saving new API key for: ${key} (length: ${String(value).length})`);
      }
      
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value === null ? null : String(value));
    }
    return c.json({ success: true });
  } catch (err: any) {
    console.error('Settings save error:', err);
    return c.json({ success: false, message: err.message }, 500);
  }
});

app.post('/admin/trigger-fetch', async (c) => {
  const { stream } = await import('hono/streaming');
  
  let overrides: any = null;
  try {
     const body = await c.req.json();
     if (body && body.provider) {
        overrides = {
           provider: body.provider,
           modelId: body.modelId,
           apiKey: body.apiKey
        };
     }
  } catch (e) {
     // No body or invalid json, that's fine
  }

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
        const { success, count } = await runAIAggregation(true, async (msg, isError) => {
           if (!isStreamClosed) {
             try { await stream.write(JSON.stringify({ type: 'progress', message: msg, error: isError }) + '\n'); } 
             catch(e) { isStreamClosed = true; }
           }
        }, overrides) as any;

        if (!isStreamClosed) {
          try { await stream.write(JSON.stringify({ type: 'complete', data: { success, message: success ? `分析任务已圆满完成。` : `分析任务未能完成。`, count: count || 0 } }) + '\n'); } 
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

// Proxy for R2 images with caching
app.get('/cdn/*', async (c) => {
  const env = getCloudEnv();
  const path = c.req.path.replace('/api/cdn/', '');
  
  // Check if R2 is actually a binding (object with get method)
  if (!env || !env.ART_GALLERY_IMAGES || typeof env.ART_GALLERY_IMAGES.get !== 'function') {
    return c.status(404);
  }
  
  try {
    const object = await env.ART_GALLERY_IMAGES.get(path);
    if (!object) return c.status(404);
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache for static assets
    
    // In dev environment, we might want to ensure CORS is handled if needed
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, { headers });
  } catch (e) {
    console.error('CDN Error:', e);
    return c.status(500);
  }
});

export const onRequest = handle(app);
export default app;
