import { getDB } from './_db';
import { GoogleGenAI, Type } from '@google/genai';
import { getCloudEnv } from './_cloud-env';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000, timeout = 20000, label = "请求", notify?: (msg: string) => void | Promise<void>, checkAbort?: () => Promise<boolean>): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      if (i > 0 && notify) {
        await notify(`🔄 ${label} 正在进行第 ${i + 1} 次重试...`);
      }
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'ArtGalleryBot/1.0 (https://ais-dev-t4zvgz5pbsgktnwi2sqgjw.run.app)',
          ...(options.headers || {})
        }
      });
      clearTimeout(timer);
      if (response.ok) return response;
      
      if (response.status === 429 || response.status >= 500) {
        const statusText = response.status === 429 ? "请求受限(429)" : `服务器错误(${response.status})`;
        if (i < retries - 1 && notify) await notify(`⚠️ ${label} 遇到 ${statusText}，${backoff * Math.pow(2, i) / 1000}s 后重试...`);
        await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        continue;
      }
      return response;
    } catch (e: any) {
      clearTimeout(timer);
      if (e.message && e.message.includes('AbortError')) throw e;
      if (e.name === 'AbortError') {
        const timeoutMsg = `${label}响应超时 (超过 ${timeout/1000} 秒)。`;
        if (i < retries - 1 && notify) await notify(`⌛ ${timeoutMsg} 正在尝试重试...`);
        if (i === retries - 1) {
          const timeoutErr = new Error(`${timeoutMsg}请检查网络或稍后重试。`);
          timeoutErr.name = 'AbortError';
          throw timeoutErr;
        }
      } else {
        if (i < retries - 1 && notify) await notify(`❌ ${label} 发生预期外错误: ${e.message}，正在重试...`);
      }
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
  throw new Error(`${label}最终失败，已重试 ${retries} 次`);
}

async function uploadToR2(url: string, id: string): Promise<{ url: string; size: number }> {
  const env = getCloudEnv();
  if (!env || !env.ART_GALLERY_IMAGES || typeof env.ART_GALLERY_IMAGES.put !== 'function') {
    return { url, size: 0 }; 
  }

  try {
    const response = await fetchWithRetry(url, {}, 3, 1000, 20000, "图片下载");
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
  { key: 'q170566', name: '故宫博物院 (The Palace Museum, Beijing)', type: 'wikidata', qid: 'Q170566' },
  { key: 'q213322', name: '维多利亚和阿尔伯特博物馆 (V&A)', type: 'wikidata', qid: 'Q213322' },
  { key: 'q178065', name: '蓬皮杜中心 (Centre Pompidou)', type: 'wikidata', qid: 'Q178065' },
  { key: 'q460889', name: '索菲亚王后国家艺术中心博物馆 (Museo Reina Sofía)', type: 'wikidata', qid: 'Q460889' },
  { key: 'q273187', name: '东京国立博物馆 (Tokyo National Museum)', type: 'wikidata', qid: 'Q273187' },
  { key: 'q510324', name: '费城艺术博物馆 (Philadelphia Museum of Art)', type: 'wikidata', qid: 'Q510324' },
  { key: 'q201469', name: '所罗门·R·古根海姆美术馆 (Guggenheim Museum)', type: 'wikidata', qid: 'Q201469' },
  { key: 'q878788', name: '惠特尼美国艺术博物馆 (Whitney Museum)', type: 'wikidata', qid: 'Q878788' },
  { key: 'q705551', name: '新南威尔士州美术馆 (Art Gallery of NSW)', type: 'wikidata', qid: 'Q705551' },
  { key: 'q1192305', name: '史密森尼美国艺术博物馆 (SAAM)', type: 'wikidata', qid: 'Q1192305' },
  { key: 'q238587', name: '英国国家肖像馆 (National Portrait Gallery)', type: 'wikidata', qid: 'Q238587' },
  { key: 'q304494', name: '苏格兰国家画廊 (Scottish National Gallery)', type: 'wikidata', qid: 'Q304494' },
  { key: 'q1327919', name: '华莱士收藏馆 (Wallace Collection)', type: 'wikidata', qid: 'Q1327919' },
  { key: 'q1137741', name: '考陶尔德美术馆 (Courtauld Gallery)', type: 'wikidata', qid: 'Q1137741' },
  { key: 'q1433216', name: '菲茨威廉博物馆 (Fitzwilliam Museum)', type: 'wikidata', qid: 'Q1433216' },
  { key: 'q636406', name: '阿什莫林博物馆 (Ashmolean Museum)', type: 'wikidata', qid: 'Q636406' },
  { key: 'q1513272', name: '休斯顿美术馆 (Museum of Fine Arts, Houston)', type: 'wikidata', qid: 'Q1513272' },
  { key: 'q1641012', name: '洛杉矶县艺术博物馆 (LACMA)', type: 'wikidata', qid: 'Q1641012' },
  { key: 'q902781', name: '旧金山现代艺术博物馆 (SFMOMA)', type: 'wikidata', qid: 'Q902781' },
  { key: 'q180907', name: '圣保罗艺术博物馆 (MASP)', type: 'wikidata', qid: 'Q180907' },
  { key: 'q2153073', name: '卡洛斯特·古尔本基安博物馆 (Gulbenkian Museum)', type: 'wikidata', qid: 'Q2153073' },
  { key: 'q264964', name: '佩姬·古根海姆美术馆 (Peggy Guggenheim Collection)', type: 'wikidata', qid: 'Q264964' },
  { key: 'q839739', name: '蒙克美术馆 (Munch Museum)', type: 'wikidata', qid: 'Q839739' },
  { key: 'q170152', name: '新绘画陈列馆 (Neue Pinakothek)', type: 'wikidata', qid: 'Q170152' },
  { key: 'q458514', name: '阿尔贝蒂娜博物馆 (Albertina)', type: 'wikidata', qid: 'Q458514' },
  { key: 'q1056580', name: '上海博物馆 (Shanghai Museum)', type: 'wikidata', qid: 'Q1056580' }
];

async function fetchFromWikidata(qid: string, sourceName: string, notify?: (msg: string, isError?: boolean) => void | Promise<void>, checkAbort?: () => Promise<boolean>) {
  if (notify) await notify(`正在向 Wikidata 请求 ${sourceName} 的艺术清单...`);
  if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
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
  
  let response;
  try {
    // 尝试获取 Wikidata 数据，设置 30 秒超时，并在 10秒和 20秒没响应时发送一个“保持心跳”的通知
    const fetchPromise = fetchWithRetry(url, { 
      headers: { 
        'Accept': 'application/sparql-results+json', 
        'User-Agent': 'ArtBot/1.0 (https://ais-dev-t4zvgz5pbsgktnwi2sqgjw.run.app)' 
      } 
    }, 2, 1000, 30000, "Wikidata 数据连接", notify, checkAbort);

    let timer10s: any, timer20s: any;
    const pulse10s = new Promise((_, reject) => 
      timer10s = setTimeout(() => reject(new Error('PULSE_10S')), 10000)
    );
    const pulse20s = new Promise((_, reject) => 
      timer20s = setTimeout(() => reject(new Error('PULSE_20S')), 20000)
    );
    pulse10s.catch(() => {});
    pulse20s.catch(() => {});

    try {
      response = await Promise.race([fetchPromise, pulse10s]);
    } catch (e: any) {
      if (e.message === 'PULSE_10S') {
        if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
        if (notify) await notify(`⌛ Wikidata 响应较慢，仍在努力加载中 (已等待 10s)...`);
        try {
          response = await Promise.race([fetchPromise, pulse20s]);
        } catch (e2: any) {
          if (e2.message === 'PULSE_20S') {
            if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
            if (notify) await notify(`⌛ Wikidata 响应极其缓慢，仍在继续尝试 (已等待 20s)...`);
            response = await fetchPromise;
          } else {
            throw e2;
          }
        }
      } else {
        throw e;
      }
    } finally {
      clearTimeout(timer10s);
      clearTimeout(timer20s);
    }

  } catch (e: any) {
    const errorMsg = e.name === 'AbortError' ? 'Wikidata 响应超时 (30s)' : (e.message || String(e));
    throw new Error(`连接失败: ${errorMsg}`);
  }

  if (!response.ok) {
    if (response.status === 429) throw new Error('Wikidata 请求被限流 (429)');
    throw new Error(`Wikidata HTTP 错误: ${response.status}`);
  }

  if (notify) await notify(`获取到 ${sourceName} 的清单，正在解析数据...`);
  let data;
  try {
    const parseController = new AbortController();
    const parseTimer = setTimeout(() => parseController.abort(), 20000); // 20s timeout for json payload reading
    const readBody = async () => {
      // Manually reading stream to support abort
      if (!response.body) return await response.json();
      const reader = response.body.getReader();
      let chunks = [];
      while (true) {
        if (parseController.signal.aborted) throw new Error("Body download timed out");
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      clearTimeout(parseTimer);
      const totalLen = chunks.reduce((acc, val) => acc + val.length, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
         combined.set(chunk, offset);
         offset += chunk.length;
      }
      return JSON.parse(new TextDecoder().decode(combined));
    };
    
    // Fallback to response.json() if stream reading fails, though usually stream works in workerd
    data = await Promise.race([
       readBody(),
       new Promise((_, rej) => setTimeout(() => { parseController.abort(); rej(new Error('Wikidata 数据流读取超时(20s)，这通常是因为该博物馆藏品过多致使对方响应慢')); }, 20000))
    ]);
  } catch (e: any) {
    throw new Error(`解析 ${sourceName} 数据时超时或失败: ${e.message}`);
  }
  const bindings = data.results?.bindings || [];
  if (bindings.length === 0) return [];
  const shuffled = bindings.sort(() => 0.5 - Math.random());
  return shuffled.map((b: any) => {
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
  }).filter((b: any) => b.primaryImage && b.title !== '未知作品');
}

async function fetchFromMet(notify?: (msg: string, isError?: boolean) => void | Promise<void>, checkAbort?: () => Promise<boolean>) {
  if (notify) await notify(`正在从大都会艺术博物馆搜寻藏品...`);
  if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
  const searchTerms = ['painting', 'Chinese painting', 'scroll painting', 'calligraphy', 'ink painting'];
  const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const searchRes = await fetchWithRetry(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isHighlight=true&q=${encodeURIComponent(randomTerm)}`, {}, 2, 1000, 30000, "大都会博物馆列表抓取", notify, checkAbort);
  const searchData = await searchRes.json();
  let objectIDs = searchData.objectIDs || [];
  objectIDs = objectIDs.sort(() => 0.5 - Math.random()).slice(0, 50);
  const results = [];
  if (notify) await notify(`在大都会艺术博物馆找到 ${objectIDs.length} 个候选，正在筛选...`);
  for (const objId of objectIDs) {
     if (results.length >= 10) break;
     if (checkAbort && await checkAbort()) break;
     try {
       const objRes = await fetchWithRetry(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objId}`, {}, 2, 1000, 30000, "大都会博物馆详情抓取", notify, checkAbort);
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
  
  const lastTaskStatus = await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_status');
  if (lastTaskStatus?.value === 'running') {
    const lastUpdate = (await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_updated_at'))?.value;
    if (lastUpdate && Date.now() - new Date(lastUpdate).getTime() < 3 * 60 * 1000) {
      if (onProgress) await onProgress(`⚠️ 任务冲突：已有${isManual ? '自动' : '手动'}任务正在执行中 (更新于 ${new Date(lastUpdate).toLocaleTimeString()})。`);
      return { success: false, message: 'Task already running' };
    }
  }

  const updateJobInDB = async (msg: string, status: string, isError = false) => {
    try {
      // 移除前缀，避免与 SSE 实时流内容产生差异导致前端去重失效
      const finalMsg = msg; 
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_status', status);
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_message', finalMsg);
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_updated_at', new Date().toISOString());
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_error', isError ? 'true' : 'false');
      
      const isStartMsg = finalMsg.includes('正在启动名画寻脉任务');
      const isSkipMsg = finalMsg.includes('后台任务未达设定的自动抓取间隔') || finalMsg.includes('未启用后台自动抓取') || finalMsg.includes('已有自动任务正在执行中') || finalMsg.includes('已有手动任务正在执行中');
      
      let logsJson = (await db.prepare('SELECT value FROM settings WHERE key = ?').get('job_logs') as any)?.value || '[]';
      let logs = [];
      try { logs = JSON.parse(logsJson); } catch (e) {}

      if (isStartMsg || isSkipMsg) {
         logs = [];
      }
      
      logs.push({
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }),
        msg: finalMsg,
        isError
      });
      if (logs.length > 50) logs = logs.slice(logs.length - 50);

      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('job_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to update job status in DB:', e);
    }
  };

  const notify = async (msg: string, isError = false) => { 
    if (onProgress) await onProgress(msg, isError); 
    await updateJobInDB(msg, 'running', isError);
  };

  let newlyAdded = 0;
  const providerSetting = (await db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_provider') as any)?.value;
  const targetProvider = overrides?.provider || providerSetting || 'gemini';
  
  // 确保启动时的引擎显示逻辑与实际逻辑一致
  const isAliStart = targetProvider === 'ali' || targetProvider === 'dashscope' || targetProvider === 'bailian';
  const engineName = isAliStart ? "阿里云百炼" : "Google Gemini";
  await updateJobInDB(`🚀 正在启动名画寻脉任务... (主要引擎: ${engineName})`, 'running');

  try {
    const getSetting = async (key: string) => await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    const provider = overrides?.provider || ((await getSetting('ai_provider')) as any)?.value || 'gemini';
    const modelId = overrides?.modelId || ((await getSetting(`${provider}_model_id`)) as any)?.value || ((await getSetting('model_id')) as any)?.value;
    const apiKey = overrides?.apiKey || ((await getSetting(`${provider}_api_key`)) as any)?.value || ((await getSetting('api_key')) as any)?.value;
  
    const intervalHours = parseInt(((await getSetting('interval_hours')) as any)?.value || '0', 10);
    const intervalMinutes = parseInt(((await getSetting('interval_minutes')) as any)?.value || '30', 10);
    let intervalMs = (intervalHours * 60 + intervalMinutes) * 60 * 1000;
    if (intervalMs < 15 * 60 * 1000) intervalMs = 15 * 60 * 1000; 
  
    const targetCount = 1;

    if (!isManual) {
       try {
         const enabledAutoFetch = (((await getSetting('enabled_auto_fetch')) as any)?.value || 'true') === 'true';
         if (!enabledAutoFetch) {
            await updateJobInDB('未启用后台自动抓取，本次触发已忽略。', 'idle');
            return { success: false, message: 'Auto fetch disabled' };
         }
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
           if (Date.now() - lastRunMs < intervalMs) {
               await updateJobInDB('后台任务未达设定的自动抓取间隔，本次触发已跳过。', 'idle');
               return { success: false, message: 'Interval not reached' };
           }
         }
       } catch(e) {}
    }

    await notify(`系统开始获取名画，本次计划获取 ${targetCount} 幅...`);
    let shuffledSources = [...SOURCES].sort(() => 0.5 - Math.random());
    
    const checkAbort = async (): Promise<boolean> => {
       try {
          const curStatus = await db.prepare("SELECT value FROM settings WHERE key = 'job_status'").get();
          if ((curStatus as any)?.value === 'idle') return true;
       } catch (e) {}
       return false;
    };

    for (const source of shuffledSources) {
       if (newlyAdded >= targetCount) break;
       if (await checkAbort()) throw new Error('AbortError: Task was manually stopped');
       await notify(`正在连接 ${source.name} 的数据源...`);
       let candidates = [];
       try {
         if (source.type === 'met_api') candidates = await fetchFromMet(notify, checkAbort);
         else if (source.type === 'wikidata') candidates = await fetchFromWikidata(source.qid, source.name, notify, checkAbort);
       } catch (err: any) {
          if (err.message && err.message.includes('AbortError')) throw err;
          await notify(`❌ 连接 ${source.name} 失败: ${err.message}`, true);
          // Small delay to ensure the error message is visible in the status field
          await new Promise(r => setTimeout(r, 2000));
          continue;
       }

       if (candidates.length === 0) {
          if (notify) await notify(`⚠️ 未从该数据源找到合适的名画，正在切换下一个源...`);
          continue;
       }

       const validCandidates = [];
       for (const objData of candidates) {
          try {
            const exists = await db.prepare('SELECT id FROM artworks WHERE source_id = ?').get(objData.sourceId);
            if (!exists) validCandidates.push(objData);
          } catch(e) { validCandidates.push(objData); }
       }

       if (validCandidates.length === 0) {
          if (notify) await notify(`⏭️ 该数据源获取到的 ${candidates.length} 幅名画均已收录在库中，正在寻找新作品...`);
          continue;
       }

       for (const objData of validCandidates) {
          if (newlyAdded >= targetCount) break;

          await notify(`精选新画作: 《${objData.title}》 - ${objData.artistDisplayName}`);
          await notify(`💡 正在进行深度分析并转存资源...`);

          try {
            const artworkId = crypto.randomUUID();
            const { url: r2Url, size: imageSize } = await uploadToR2(objData.primaryImage, artworkId);
            const aiData = await generateDetailedInterpretation(objData.title, objData.artistDisplayName, objData.objectDate || '未知年份', provider, modelId, apiKey, notify, checkAbort);

            const title_zh = aiData.title_zh && aiData.title_zh !== '中文译名' ? aiData.title_zh : objData.title;
            const artist_zh = aiData.artist_zh && aiData.artist_zh !== '中文画家名' ? aiData.artist_zh : objData.artistDisplayName;
            const keywordsStr = aiData.keywords || '';

            await db.prepare(`
              INSERT INTO artworks (id, source_id, title, artist, year, museum, image_url, image_size, source_url, ai_interpretation, keywords)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(artworkId, objData.sourceId, title_zh, artist_zh, objData.objectDate, objData.repository, r2Url, imageSize, objData.objectURL, aiData.content, keywordsStr);

            newlyAdded++;
          } catch (itemErr: any) {
            await notify(`❌ 处理《${objData.title}》时出错: ${itemErr.message}`, true);
            // 如果是 AI API 凭证错误或限流，直接中断整个抓取避免疯狂报错
            const errLower = itemErr.message.toLowerCase();
            if (errLower.includes('aborterror')) throw itemErr;
            const isCriticalError = ['api 密钥', '限流', '额度', '频繁', 'auth', 'api key', '429', '401', '403', 'quota', 'rate limit', 'exhausted'].some(keyword => errLower.includes(keyword));
            if (isCriticalError) {
              throw itemErr; 
            }
            continue; 
          }
       }
    }
    
    if (newlyAdded >= targetCount) {
       await updateJobInDB(`分析任务完成。新增 ${newlyAdded} 幅名作。`, 'idle');
    } else {
       await updateJobInDB(`任务结束，未发现新作品。`, 'idle');
    }
    return { success: true, count: newlyAdded };
  } catch (err: any) {
    if (err.message && err.message.includes('AbortError')) {
       return { success: false, message: 'Task aborted by user' };
    }
    await updateJobInDB(`分析任务出错: ${err.message}`, 'idle', true);
    return { success: false, message: err.message };
  }
}

export async function generateDetailedInterpretation(title: string, artist: string, year: string, provider: string, modelId?: string, userApiKey?: string, notify?: (msg: string, isError?: boolean) => void | Promise<void>, checkAbort?: () => Promise<boolean>) {
  const prompt = `你是一位风趣幽默、见多识广、偶尔带点“凡尔赛”气息的顶级艺术策展人。
请为以下名画撰写一篇让人欲罢不能的高深度、长篇赏析。同时，请将画作名称和创作者翻译成中文（如果是外语）。
【创作要求】：
1. **字数与结构**：赏析内容（content字段）字数必须严格在 700 至 900 字之间。正文内容需使用 <h3> 标签包含 3 到 5 个小标题，**小标题内严禁出现任何数字序号或项目符号**（如“1., 2., 一、, 二、, 第一, 其一”等）。
2. **讲故事，别讲课**：讲讲这幅画背后的轶事、画家的特殊习惯或者那个时代的背景。
3. **金句频出**：每段建议包含一两个耐人寻味的段子或金句。
4. **排版优雅**：使用 HTML 标签（h3, p, strong）进行排版。严禁输出任何 Markdown 标记（如反引号）。

【严禁行为】：
- 严禁在 JSON 字段内或外部包含任何自我解释、元评论。
- 严禁输出字数统计信息。
- 严禁输出如 "I have followed your instructions" 等此类提示词遵从反馈。

【待解读画作】：
名称：《${title}》
创作者：${artist}
创作年份：${year}

请严格按此 JSON 格式输出，不要有任何多余字符：
{
  "title_zh": "中文译名",
  "artist_zh": "中文画家名",
  "keywords": "3-5个关键词",
  "content": "深度赏析内容"
}`;
  
  let keywords = "艺术, 名画";
  let title_zh = title;
  let artist_zh = artist;

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const env = getCloudEnv();
    let aiKey = userApiKey;
    const isAli = provider === 'dashscope' || provider === 'bailian' || provider === 'ali';
    const providerName = isAli ? '阿里云百炼' : 'Google Gemini';

    const isObviouslyInvalid = (key: string | undefined): boolean => {
       if (!key || typeof key !== 'string') return true;
       const trimmed = key.trim();
       // If it's a placeholder like "*****" or "YOUR_KEY_HERE"
       if (trimmed.length < 10 || trimmed.includes('***') || trimmed.toUpperCase().includes('KEY')) return true;
       return false;
    };

    const defaultModelId = isAli ? 'qwen-max' : 'gemini-3-flash-preview';
    let displayedModelId = modelId || defaultModelId;
    
    // Prohibit legacy versions if necessary, but 1.5 is still very stable. 
    // We only remap if the user is using something very old or if we really want to push the preview.
    // Reverting the strict prohibition to allow expert users to use 1.5-flash if preferred.
    if (displayedModelId === 'gemini-1.0-pro') {
      displayedModelId = 'gemini-1.5-flash';
    }

    try {
      if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
      // Fallback logic for keys
      if (isObviouslyInvalid(aiKey)) {
        const fallbackKeyKey = isAli ? 'DASHSCOPE_API_KEY' : 'GEMINI_API_KEY';
        const envKey = env[fallbackKeyKey];
        if (envKey && !isObviouslyInvalid(envKey)) {
           aiKey = envKey;
        }
      }

      const maskedForLog = aiKey ? (aiKey.length > 8 ? aiKey.substring(0, 4) + '...' + aiKey.substring(aiKey.length-4) : '***') : 'NONE';
      console.log(`[AI] Provider: ${provider}, Model: ${displayedModelId}, Key: ${maskedForLog}`);

      if (isObviouslyInvalid(aiKey)) {
        if (notify) await notify(`⚠️ 尚未配置 ${providerName} API 密钥或密钥格式不正确`, true);
        throw new Error(`[Auth] 尚未配置有效的 ${providerName} API 密钥。`);
      }
      
      if (notify) await notify(`🤖 正在调用 ${providerName} (${displayedModelId}) (第 ${attempt} 次尝试) ...`);

      let text = "";
      const modelNameForLog = isAli ? '阿里云' : 'Google Gemini';

      let timer20s: any, timer40s: any, timer60s: any;
      const pulse20s = new Promise((_, reject) => timer20s = setTimeout(() => reject(new Error('PULSE_20S')), 20000));
      const pulse40s = new Promise((_, reject) => timer40s = setTimeout(() => reject(new Error('PULSE_40S')), 40000));
      const pulse60s = new Promise((_, reject) => timer60s = setTimeout(() => reject(new Error('PULSE_60S')), 60000));
      pulse20s.catch(() => {});
      pulse40s.catch(() => {});
      pulse60s.catch(() => {});

      const runWithPulses = async <T,>(promise: Promise<T>): Promise<T> => {
         try {
            return await Promise.race([promise, pulse20s as Promise<T>]);
         } catch (e: any) {
            if (e.message === 'PULSE_20S') {
                if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
                if (notify) await notify(`⌛ ${modelNameForLog} 模型思考中 (第 ${attempt} 次尝试，已等待 20s)...`);
                try {
                  return await Promise.race([promise, pulse40s as Promise<T>]);
                } catch (e2: any) {
                  if (e2.message === 'PULSE_40S') {
                      if (checkAbort && await checkAbort()) throw new Error('AbortError: Task was manually stopped');
                      if (notify) await notify(`⌛ ${modelNameForLog} 深度思考中，请耐心等候 (第 ${attempt} 次尝试，已等待 40s)...`);
                      try {
                        return await Promise.race([promise, pulse60s as Promise<T>]);
                      } catch (e3: any) {
                        if (e3.message === 'PULSE_60S') {
                            throw new Error(`请求响应超时放弃 (第 ${attempt} 次尝试，已等待 60s)`);
                        }
                        throw e3;
                      }
                  } else {
                      throw e2;
                  }
                }
            } else {
                throw e;
            }
         } finally {
            clearTimeout(timer20s);
            clearTimeout(timer40s);
            clearTimeout(timer60s);
         }
      };

      if (isAli) {
         // Optimization for Alibaba: Use the direct model ID if it carries the prefix, 
         // otherwise ensure the compatible-mode endpoint is used correctly.
         const fetchPromise = fetchWithRetry('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
           method: 'POST',
           headers: { 
             'Content-Type': 'application/json', 
             'Authorization': `Bearer ${aiKey}` 
           },
           body: JSON.stringify({
             model: displayedModelId,
             messages: [
               { role: 'system', content: 'You are a professional art curator. You MUST output your response in valid JSON format only.' },
               { role: 'user', content: prompt }
             ],
             temperature: 0.7,
             top_p: 0.8
           })
         }, 1, 0, 70000, "阿里云API调用");

         const res: any = await runWithPulses(fetchPromise);

         if (notify) await notify(`📡 阿里云响应已接收 (HTTP ${res.status})，正在处理数据...`);

         if (!res.ok) {
           const errText = await res.text();
           let errJson: any = {};
           try { errJson = JSON.parse(errText); } catch(e) {}
           throw new Error(`阿里云 API 错误: [${res.status}] ${errJson.error?.message || errJson.message || errText}`);
         }

         const data: any = await res.json();
         text = data.choices?.[0]?.message?.content || "{}";
         if (notify) await notify(`📑 内容已提取，字数：${text.length}，正在解析 JSON 结构...`);
       } else {
         const ai = new GoogleGenAI({ apiKey: aiKey });
         const geminiPromise = ai.models.generateContent({
            model: displayedModelId,
            contents: prompt,
            config: {
               responseMimeType: "application/json",
               responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title_zh: { type: Type.STRING },
                    artist_zh: { type: Type.STRING },
                    keywords: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["title_zh", "artist_zh", "keywords", "content"]
               }
            }
         });
         const response: any = await runWithPulses(geminiPromise);
         text = response.text || "{}";
       }

      let parsed: any = {};
      try {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanText = jsonMatch[0];
        parsed = JSON.parse(cleanText);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) { }
        }
      }

      let content = parsed.content || `<p>暂无解读内容。</p>`;
      
      const metaMarkers = [
        "I hope this fits", 
        "Word count:", 
        "Total word count", 
        "Fragment identifier", 
        "JSON string", 
        "correctly placed",
        "Actually, per the prompt"
      ];
      
      for (const marker of metaMarkers) {
        const idx = content.indexOf(marker);
        if (idx !== -1 && idx > content.length * 0.7) {
          content = content.substring(0, idx).trim();
          content = content.replace(/["'}\s`]+$/, '');
          if (content.endsWith('<')) content = content.slice(0, -1);
          if (!content.endsWith('>') && !content.endsWith('。')) content += '...';
        }
      }

      const finalKeywords = parsed.keywords || keywords;
      const finalTitle_zh = parsed.title_zh || title_zh;
      const finalArtist_zh = parsed.artist_zh || artist_zh;
      
      if (notify) await notify("✅ AI 深度解读完成。");
      return { keywords: finalKeywords, content, title_zh: finalTitle_zh, artist_zh: finalArtist_zh };

    } catch (e: any) {
      if (e.message && e.message.includes('AbortError')) throw e;
      let errorMsg = e.message || String(e);
      if (e.name === 'AbortError' || errorMsg.includes('aborted')) {
        errorMsg = `此操作由于响应过慢已中止（已超过预计的最长等待时间）。正在尝试更换模型或重试...`;
      }
      console.error(`AI error (attempt ${attempt}):`, errorMsg);
      
      // Handle Quota Exceeded (429) / RESOURCE_EXHAUSTED
      if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('Quota exceeded')) {
        const isDailyLimit = errorMsg.includes('FreeTier') || errorMsg.includes('day');
        const limitMsg = isDailyLimit 
          ? `🚫 您已达到 ${providerName} 的每日免费额度限制（通常为每日 20 次请求）。请稍后再试或在后台设置中切换 API 密钥。` 
          : `⚠️ ${providerName} 请求过于频繁，请稍候再试。`;
        
        if (notify) await notify(limitMsg, true);
        throw new Error(limitMsg);
      }

      // If it's an API Key error, and we aren't already using the environment key fallback,
      // try to switch to the env key for the next attempt.
      if ((errorMsg.includes('API key not valid') || errorMsg.includes('INVALID_ARGUMENT') || errorMsg.includes('Unauthorized')) && attempt < maxRetries) {
        const fallbackKeyKey = isAli ? 'DASHSCOPE_API_KEY' : 'GEMINI_API_KEY';
        const envKey = env[fallbackKeyKey];
        if (envKey && envKey !== aiKey && !isObviouslyInvalid(envKey)) {
          console.log(`[AI] Previous key failed, attempting fallback to environment key...`);
          userApiKey = envKey; // Update our source so the next loop iteration picks it up
          if (notify) await notify(`🔄 预设密钥无效或鉴权失败，正在切换到系统备用密钥重试...`, true);
        }
      }

      if (attempt === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  return { keywords, content: "<p>未能完成详细解读。</p>", title_zh, artist_zh };
}
