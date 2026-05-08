import { getDB } from './_db';
import { GoogleGenAI, Type } from '@google/genai';
import { getCloudEnv } from './_cloud-env';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000, timeout = 20000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          ...(options.headers || {})
        }
      });
      clearTimeout(timer);
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        // Rate limit or server error - wait and retry
        await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        continue;
      }
      return response;
    } catch (e: any) {
      clearTimeout(timer);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function uploadToR2(url: string, id: string): Promise<{ url: string; size: number }> {
  const env = getCloudEnv();
  // Check if R2 is actually a binding (object with put method)
  if (!env || !env.ART_GALLERY_IMAGES || typeof env.ART_GALLERY_IMAGES.put !== 'function') {
    return { url, size: 0 }; 
  }

  try {
    const response = await fetchWithRetry(url);
    if (!response.ok) return { url, size: 0 };
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;
    const fileName = `artworks/${id}.${contentType.split('/')[1] || 'jpg'}`;
    
    await env.ART_GALLERY_IMAGES.put(fileName, buffer, {
      httpMetadata: { contentType }
    });
    
    return { url: `/api/cdn/${fileName}`, size };
  } catch (e) {
    console.error('R2 Upload failed:', e);
    return { url, size: 0 };
  }
}

const SOURCES = [
  { key: 'met_api', name: '大都会艺术博物馆 (The Met)', type: 'met_api' },
  { key: 'q19675', name: '卢浮宫 (The Louvre)', type: 'wikidata', qid: 'Q19675' },
  { key: 'q180788', name: '英国国家美术馆 (National Gallery)', type: 'wikidata', qid: 'Q180788' },
  { key: 'q190804', name: '荷兰国立博物馆 (Rijksmuseum)', type: 'wikidata', qid: 'Q190804' },
  { key: 'q160112', name: '普拉多博物馆 (Museo del Prado)', type: 'wikidata', qid: 'Q160112' },
  { key: 'q51252', name: '乌菲兹美术馆 (Uffizi Gallery)', type: 'wikidata', qid: 'Q51252' },
  { key: 'q132783', name: '冬宫博物馆 (State Hermitage Museum)', type: 'wikidata', qid: 'Q132783' },
  { key: 'q239303', name: '芝加哥艺术博物馆 (Art Institute of Chicago)', type: 'wikidata', qid: 'Q239303' },
  { key: 'q188646', name: '现代艺术博物馆 (MoMA)', type: 'wikidata', qid: 'Q188646' },
  { key: 'q374820', name: '克利夫兰艺术博物馆 (Cleveland Museum of Art)', type: 'wikidata', qid: 'Q374820' },
  { key: 'q214867', name: '国家美术馆 (National Gallery of Art, DC)', type: 'wikidata', qid: 'Q214867' },
  { key: 'q731126', name: '保罗·盖蒂博物馆 (J. Paul Getty Museum)', type: 'wikidata', qid: 'Q731126' },
  { key: 'q23402', name: "奥赛博物馆 (Musée d'Orsay)", type: 'wikidata', qid: 'Q23402' },
  { key: 'q224124', name: '梵高博物馆 (Van Gogh Museum)', type: 'wikidata', qid: 'Q224124' },
  { key: 'q193375', name: '泰特现代艺术馆 (Tate Modern)', type: 'wikidata', qid: 'Q193375' },
  { key: 'q154568', name: '老绘画陈列馆 (Alte Pinakothek)', type: 'wikidata', qid: 'Q154568' },
  { key: 'q221092', name: '莫瑞泰斯皇家美术馆 (Mauritshuis)', type: 'wikidata', qid: 'Q221092' },
  { key: 'q730030', name: '博尔盖塞美术馆 (Galleria Borghese)', type: 'wikidata', qid: 'Q730030' },
  { key: 'q303139', name: '美景宫 (Belvedere)', type: 'wikidata', qid: 'Q303139' },
  { key: 'q95569', name: '艺术史博物馆 (Kunsthistorisches Museum)', type: 'wikidata', qid: 'Q95569' },
  { key: 'q183334', name: '特列季亚科夫画廊 (Tretyakov Gallery)', type: 'wikidata', qid: 'Q183334' },
  { key: 'q1395996', name: '毕尔巴鄂美术馆 (Museo de Bellas Artes de Bilbao)', type: 'wikidata', qid: 'Q1395996' },
  { key: 'q165631', name: '柏林画廊 (Gemäldegalerie)', type: 'wikidata', qid: 'Q165631' },
  { key: 'q176251', name: '提森-博内米萨博物馆 (Thyssen-Bornemisza Museum)', type: 'wikidata', qid: 'Q176251' },
  { key: 'q540540', name: '国立故宫博物院 (National Palace Museum, Taipei)', type: 'wikidata', qid: 'Q540540' },
  { key: 'q49133', name: '波士顿美术馆 (Museum of Fine Arts, Boston)', type: 'wikidata', qid: 'Q49133' },
  { key: 'q1454516', name: '弗利尔美术馆 (Freer Gallery of Art)', type: 'wikidata', qid: 'Q1454516' },
  { key: 'q427014', name: '吉美博物馆 (Musée Guimet)', type: 'wikidata', qid: 'Q427014' },
  { key: 'q664879', name: '赛努奇博物馆 (Musée Cernuschi)', type: 'wikidata', qid: 'Q664879' },
  { key: 'q170566', name: '故宫博物院 (The Palace Museum, Beijing)', type: 'wikidata', qid: 'Q170566' }
];

async function fetchFromWikidata(qid, sourceName, notify) {
  if (notify) await notify(`正在向 Wikidata 请求 ${sourceName} 的艺术清单...`);
  const query = `
    SELECT ?item ?itemLabel ?creatorLabel ?image ?date WHERE {
      VALUES ?type { 
        wd:Q3305213 wd:Q1683416 wd:Q5100913 wd:Q433454 wd:Q838948 
        wd:Q428054 wd:Q2152862 wd:Q1750219 wd:Q1347065 wd:Q42502 
        wd:Q1195655 wd:Q659357 wd:Q15303496 wd:Q1058223 wd:Q3534015
      }
      ?item wdt:P31 ?type;
            wdt:P195 wd:${qid};
            wdt:P18 ?image.
      OPTIONAL { ?item wdt:P170 ?creator. }
      OPTIONAL { ?item wdt:P571|wdt:P580 ?date. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
    }
    LIMIT 200
  `;
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query);
  const response = await fetchWithRetry(url, { headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': 'ArtBot/1.0' } }, 2, 1000, 30000); 
  if (!response.ok) throw new Error('Wikidata HTTP error: ' + response.statusText);
  if (notify) await notify(`获取到 ${sourceName} 的清单，正在解析...`);
  const data = await response.json();
  const bindings = data.results?.bindings || [];
  if (bindings.length === 0) return [];
  const shuffled = bindings.sort(() => 0.5 - Math.random());
  return shuffled.map((b) => {
     let rawImg = b.image?.value || '';
     if (rawImg && rawImg.includes('Special:FilePath')) {
        rawImg += '?width=1200';
     }
     return {
       sourceId: 'wd_' + (b.item?.value || '').split('/').pop(),
       title: b.itemLabel?.value || '未知作品',
       artistDisplayName: b.creatorLabel?.value || '未知艺术家',
       objectDate: b.date?.value ? b.date.value.split('T')[0] : '未知年份',
       repository: sourceName,
       primaryImage: rawImg.replace('http://', 'https://'),
       objectURL: b.item?.value || ''
     }
  }).filter(b => b.primaryImage && b.title !== '未知作品');
}

async function fetchFromMet(notify) {
  if (notify) await notify(`正在从大都会艺术博物馆搜寻藏品...`);
  const searchTerms = ['painting', 'Chinese painting', 'scroll painting', 'calligraphy', 'ink painting'];
  const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const searchRes = await fetchWithRetry(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isHighlight=true&q=${encodeURIComponent(randomTerm)}`);
  const searchData = await searchRes.json();
  let objectIDs = searchData.objectIDs || [];
  objectIDs = objectIDs.sort(() => 0.5 - Math.random()).slice(0, 50);
  const results = [];
  if (notify) await notify(`在大都会艺术博物馆找到 ${objectIDs.length} 个候选，正在筛选...`);
  for (const objId of objectIDs) {
     if (results.length >= 10) break;
     try {
       const objRes = await fetchWithRetry(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objId}`);
       if (!objRes.ok) continue;
       const objData = await objRes.json();
       if (!objData.primaryImage || !objData.title || !objData.artistDisplayName) continue;
       results.push({
         sourceId: `met_${objId}`,
         title: objData.title,
         artistDisplayName: objData.artistDisplayName,
         objectDate: objData.objectDate || '未知年份',
         repository: objData.repository || '大都会艺术博物馆 (The Met)',
         primaryImage: objData.primaryImage,
         objectURL: objData.objectURL || ''
       });
     } catch (e) { }
  }
  return results;
}

export async function runAIAggregation(isManual: boolean = false, onProgress?: (msg: string, isError?: boolean) => void | Promise<void>, overrides?: { provider?: string, modelId?: string, apiKey?: string }) {
  const db = await getDB();
  
  // Concurrency Lock
  const lastTaskStatus = await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_status');
  if (lastTaskStatus?.value === 'running') {
    const lastUpdate = (await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_updated_at'))?.value;
    // If it's been running for less than 3 minutes, skip
    if (lastUpdate && Date.now() - new Date(lastUpdate).getTime() < 3 * 60 * 1000) {
      if (onProgress) await onProgress('已经有一个任务正在运行中，请稍后再试。');
      return { success: false, message: 'Task already running' };
    }
  }

  const updateJobInDB = async (msg: string, status: string, isError = false) => {
    try {
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_status', status);
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_message', msg);
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_updated_at', new Date().toISOString());
      if (isError) {
        await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_error', 'true');
      } else {
        await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_error', 'false');
      }
    } catch (e) {
      console.error('Failed to update job status in DB:', e);
    }
  };

  const notify = async (msg: string, isError = false) => { 
    if (onProgress) await onProgress(msg, isError); 
    if (isManual) {
       await updateJobInDB(msg, 'running', isError);
    }
  };

  let newlyAdded = 0;
  if (isManual) {
    await updateJobInDB('正在启动名画寻脉任务...', 'running');
  }

  try {
    const getSetting = async (key: string) => await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    
    // Use overrides OR database settings
    const provider = overrides?.provider || ((await getSetting('ai_provider')) as any)?.value || 'gemini';
    const modelId = overrides?.modelId || ((await getSetting(`${provider}_model_id`)) as any)?.value || ((await getSetting('model_id')) as any)?.value;
    const apiKey = overrides?.apiKey || ((await getSetting(`${provider}_api_key`)) as any)?.value || ((await getSetting('api_key')) as any)?.value;
  
  const intervalHours = parseInt(((await getSetting('interval_hours')) as any)?.value || '0', 10);
  const intervalMinutes = parseInt(((await getSetting('interval_minutes')) as any)?.value || '30', 10);
  let intervalMs = (intervalHours * 60 + intervalMinutes) * 60 * 1000;
  if (intervalMs < 30 * 60 * 1000) intervalMs = 30 * 60 * 1000; // minimum 30 mins
  
  const targetCount = 1;

  if (!isManual) {
     try {
       const enabledAutoFetch = (((await getSetting('enabled_auto_fetch')) as any)?.value || 'true') === 'true';
       if (enabledAutoFetch) {
         const result: any = await db.prepare("SELECT max(created_at) as last_run FROM artworks").get();
         let lastRunMs = 0;
         if (result?.last_run) {
            const dateStr = String(result.last_run).trim();
            let isoStr = dateStr;
            if (!dateStr.includes('T')) isoStr = dateStr.replace(' ', 'T');
            if (!isoStr.endsWith('Z') && !isoStr.includes('+')) isoStr += 'Z';
            lastRunMs = isNaN(new Date(isoStr).getTime()) ? 0 : new Date(isoStr).getTime();
         }
         const now = Date.now();
         if (now - lastRunMs < intervalMs) {
           await notify('未达到触发间隔，跳过自动抓取任务。');
           return { success: false, message: '未达到自动抓取间隔时间。' };
         }
       }
     } catch(e) {}
  }

  await notify(`系统开始获取名画，本次计划获取 ${targetCount} 幅...`);
  let shuffledSources = [...SOURCES].sort(() => 0.5 - Math.random());
  
  // 70% chance to put Chinese/Asian sources at the front
  if (Math.random() < 0.7) {
     const asianMuseums = ['故宫博物院', '国立故宫博物院', '上海博物馆', '辽宁省博物馆', '浙江省博物馆', '波士顿美术馆', '弗利尔美术馆', '吉美博物馆', '赛努奇博物馆'];
     const cSources = shuffledSources.filter(s => asianMuseums.some(n => s.name.includes(n)));
     const wSources = shuffledSources.filter(s => !asianMuseums.some(n => s.name.includes(n)));
     shuffledSources = [...cSources, ...wSources];
  }

  for (const source of shuffledSources) {
     if (newlyAdded >= targetCount) break;
     await notify(`正在连接 ${source.name} 的数据源...`);
     let candidates = [];
     try {
       if (source.type === 'met_api') candidates = await fetchFromMet(notify);
       else if (source.type === 'wikidata') candidates = await fetchFromWikidata(source.qid, source.name, notify);
     } catch (err: any) {
        await notify(`连接 ${source.name} 失败: ${err.message}`, true);
        continue;
     }

     if (candidates.length === 0) continue;

     for (const objData of candidates) {
        if (newlyAdded >= targetCount) break;
        try {
          const exists = await db.prepare('SELECT id FROM artworks WHERE source_id = ?').get(objData.sourceId);
          if (exists) continue;
        } catch(e) {}

        await notify(`精选名画: 《${objData.title}》 - ${objData.artistDisplayName}`);
        await notify(`💡 正在进行深度分析并转存资源...`);

        try {
          const artworkId = crypto.randomUUID();
          const { url: r2Url, size: imageSize } = await uploadToR2(objData.primaryImage, artworkId);
          const aiData = await generateDetailedInterpretation(objData.title, objData.artistDisplayName, objData.objectDate || '未知年份', provider, modelId, apiKey, notify);

          if (aiData.content.includes('解读生成失败') || aiData.content.includes('未能生成详细解读')) {
            await notify(`❌ 《${objData.title}》 AI 解读失败，跳过添加。`, true);
            continue;
          }

          const title_zh = aiData.title_zh && aiData.title_zh !== '中文译名' ? aiData.title_zh : objData.title;
          const artist_zh = aiData.artist_zh && aiData.artist_zh !== '中文画家名' ? aiData.artist_zh : objData.artistDisplayName;
          const keywordsStr = Array.isArray(aiData.keywords) ? aiData.keywords.join(', ') : String(aiData.keywords || '');

          await db.prepare(`
            INSERT INTO artworks (id, source_id, title, artist, year, museum, image_url, image_size, source_url, ai_interpretation, keywords)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(artworkId, objData.sourceId, title_zh, artist_zh, objData.objectDate, objData.repository, r2Url, imageSize, objData.objectURL, aiData.content, keywordsStr);

          newlyAdded++;
        } catch (itemErr: any) {
          await notify(`❌ 处理《${objData.title}》时出错: ${itemErr.message}，正在尝试其他候选项...`, true);
          continue; 
        }
     }
  }
  
  return { success: true, count: newlyAdded };
  } catch (err: any) {
    console.error('runAIAggregation failed:', err);
    if (isManual) {
      await updateJobInDB(`分析任务出错了: ${err.message}`, 'idle', true);
    }
    return { success: false, message: err.message };
  } finally {
    if (isManual) {
      // status has already been set in catch or at the end of try
      // but let's make sure it's idle
      const statusMsg = newlyAdded >= 0 ? `分析任务已圆满完成。本次新增 ${newlyAdded} 幅名作。` : `任务已结束。`;
      await updateJobInDB(statusMsg, 'idle');
    }
  }
}

export async function generateDetailedInterpretation(title: string, artist: string, year: string, provider: string, modelId?: string, userApiKey?: string, notify?: (msg: string, isError?: boolean) => void | Promise<void>) {
  const prompt = `你是一位风趣幽默、见多识广、偶尔带点“凡尔赛”气息的顶级艺术策展人。
请为以下名画撰写一篇让人欲罢不能的深度赏析。同时，请将画作名称和创作者翻译成中文（如果是外语）。
【创作要求】：
1. **讲故事，别讲课**：讲讲这幅画背后的轶事、画家的“槽点”或者那个时代的荒诞瞬间。
2. **幽默但专业**：在幽默中夹杂硬核艺术见解。
3. **字数下限**：赏析内容的字数必须在 800 至 1000 字之间，务必保证内容的深度与丰富度。
4. **金句频出**：每段建议包含一两个耐人寻味的段子或金句。
5. **排版优雅**：使用 HTML 标签（<h3>、<p>、<strong>）进行排版。
【待解读画作】：
名称：《${title}》
创作者：${artist}
创作年份：${year}
请严格按以下 JSON 格式输出（必须返回合法的JSON字符串）：
{
  "title_zh": "中文译名（如已有中文则保持）",
  "artist_zh": "中文画家名（如已有中文则保持）",
  "keywords": "至少三个关键词，如：印象派, 梵高, 麦田",
  "content": "...赏析内容..."
}`;
  
  let aiInterpretation = "<p>未能生成详细解读。</p>";
  let keywords = "艺术, 名画";
  let title_zh = title;
  let artist_zh = artist;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const env = getCloudEnv();
      let aiKey = userApiKey;
      const isAli = provider === 'dashscope' || provider === 'bailian';
      const providerName = isAli ? '阿里云百炼' : 'Google Gemini';

      // Advanced check: If it's just asterisks, or a placeholder, we shouldn't use it.
      // E.g. "******" or "请设置..."
      const isObviouslyInvalid = (key: string | undefined): boolean => {
         if (!key || typeof key !== 'string') return true;
         const trimmed = key.trim();
         if (trimmed.length === 0) return true;
         if (trimmed.includes('***')) return true;
         if (trimmed.length < 10) return true; 
         return false;
      };

      // Use environment key as fallback for Gemini in AI Studio
      if (!isAli && isObviouslyInvalid(aiKey)) {
        const envKey = env.GEMINI_API_KEY;
        if (envKey && !isObviouslyInvalid(envKey)) {
          aiKey = envKey;
        }
      }

      const maskedForLog = aiKey ? (aiKey.length > 8 ? aiKey.substring(0, 4) + '...' + aiKey.substring(aiKey.length-4) : '***') : 'NONE';
      console.log(`AI Fetcher using key: ${maskedForLog} for provider: ${provider}`);

      if (isObviouslyInvalid(aiKey)) {
        if (notify) await notify(`⚠️ 尚未配置 ${providerName} API 密钥`, true);
        return { 
          keywords, 
          content: `<p>尚未配置 ${providerName} API 密钥或密钥无效。请在管理员控制台设置有效的 API 密钥以生成艺术解读。</p>`,
          title_zh: title,
          artist_zh: artist
        };
      }

      const defaultModelId = isAli ? 'qwen-max' : 'gemini-1.5-flash';
      const displayedModelId = modelId || defaultModelId;
      
      if (notify) {
        const attemptMsg = attempt > 1 ? ` (重试第 ${attempt-1} 次)` : '';
        await notify(`🤖 正在调用 ${providerName} (${displayedModelId})${attemptMsg} ...`);
      }

      let text = "";

      if (isAli) {
         const res = await fetchWithRetry('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${aiKey}`
           },
           body: JSON.stringify({
             model: displayedModelId,
             messages: [
               { role: 'system', content: 'You are a professional art curator. Always output strictly valid JSON.' },
               { role: 'user', content: prompt }
             ],
             response_format: { type: "json_object" }
           })
         });
         
         if (!res.ok) {
           const err = await res.text();
           throw new Error(`Alibaba AI Error [${res.status}]: ${err}`);
         }
         
         const data: any = await res.json();
         if (data.code || (data.message && !data.choices)) {
             throw new Error(`Alibaba AI Error: [${data.code || 'Unknown'}] ${data.message || 'No response'}`);
         }
         text = data.choices?.[0]?.message?.content || "{}";
       } else {
         // Default: Gemini - Using new @google/genai SDK
         const ai = new GoogleGenAI({ apiKey: aiKey });
         // Using the latest modern alias for text tasks as per requirements to "let gemini decide"
         const response = await ai.models.generateContent({
            model: displayedModelId, // Use the selected model
            contents: prompt,
            config: {
               responseMimeType: "application/json",
               responseSchema: {
                 type: Type.OBJECT,
                 properties: {
                   title_zh: { type: Type.STRING },
                   artist_zh: { type: Type.STRING },
                   keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                   content: { type: Type.STRING }
                 },
                 required: ["title_zh", "artist_zh", "keywords", "content"]
               }
            }
         });
         text = response.text || "{}";
       }

      let parsed: any = {};
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) { }
        }
      }

      const content = parsed.content || `<p>暂无解读内容。</p>`;
      const finalKeywords = parsed.keywords || keywords;
      const finalTitle_zh = parsed.title_zh || title_zh;
      const finalArtist_zh = parsed.artist_zh || artist_zh;
      
      if (notify) await notify("✅ AI 深度解读完成并提取结果。");
      return { keywords: finalKeywords, content, title_zh: finalTitle_zh, artist_zh: finalArtist_zh };

    } catch (e: any) {
      lastError = e;
      const errText = e.message || String(e);
      console.error(`AI error (attempt ${attempt}):`, errText);
      const isQuota = errText.includes('429') || errText.includes('quota') || errText.includes('RESOURCE_EXHAUSTED');
      
      if (attempt < maxRetries && !isQuota) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      } else {
        if (notify) await notify(isQuota ? "⚠️ AI 配额已耗尽或请求受限，请稍后再试。" : `❌ AI 调用最终失败: ${errText}`, true);
        throw e;
      }
    }
  }
  
  throw new Error("AI 解读调用最终失败");
}
