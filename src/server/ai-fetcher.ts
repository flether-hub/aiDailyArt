import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { getCloudEnv } from './cloud-env';

async function uploadToR2(url: string, id: string): Promise<string> {
  const env = getCloudEnv();
  if (!env.ART_GALLERY_IMAGES) return url; 

  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const fileName = `artworks/${id}.${contentType.split('/')[1] || 'jpg'}`;
    
    await env.ART_GALLERY_IMAGES.put(fileName, buffer, {
      httpMetadata: { contentType }
    });
    
    const baseUrl = env.APP_URL || '';
    return `${baseUrl}/api/cdn/${fileName}`;
  } catch (e) {
    console.error('R2 Upload failed:', e);
    return url;
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
  { key: 'q176251', name: '提森-博内米萨博物馆 (Thyssen-Bornemisza Museum)', type: 'wikidata', qid: 'Q176251' }
];

async function fetchFromWikidata(qid, sourceName, notify) {
  const query = `
    SELECT ?item ?itemLabel ?creatorLabel ?image ?date WHERE {
      ?item wdt:P31 wd:Q3305213;
            wdt:P195 wd:${qid};
            wdt:P18 ?image.
      OPTIONAL { ?item wdt:P170 ?creator. }
      OPTIONAL { ?item wdt:P571|wdt:P580 ?date. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
    }
    LIMIT 200
  `;
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query);
  const response = await fetch(url, { headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': 'ArtBot/1.0' } });
  if (!response.ok) throw new Error('Wikidata HTTP error: ' + response.statusText);
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
       primaryImage: rawImg,
       objectURL: b.item?.value || ''
     }
  }).filter(b => b.primaryImage && b.title !== '未知作品');
}

async function fetchFromMet(notify) {
  const searchRes = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isHighlight=true&q=painting');
  const searchData = await searchRes.json();
  let objectIDs = searchData.objectIDs || [];
  objectIDs = objectIDs.sort(() => 0.5 - Math.random()).slice(0, 50);
  const results = [];
  for (const objId of objectIDs) {
     if (results.length >= 10) break;
     try {
       const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objId}`);
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

export async function runAIAggregation(isManual: boolean = false, onProgress?: (msg: string, isError?: boolean) => void | Promise<void>) {
  const db = getDB();
  const notify = async (msg: string, isError = false) => { if (onProgress) await onProgress(msg, isError); };

  const getSetting = (key: string) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  const provider = (await getSetting('ai_provider'))?.value || 'gemini';
  const modelId = (await getSetting('model_id'))?.value;
  const apiKey = (await getSetting('api_key'))?.value;
  const dailyLimit = parseInt((await getSetting('daily_limit'))?.value || '1', 10);
  
  let todayCount = 0;
  try {
     const result = await db.prepare("SELECT count(*) as c FROM artworks WHERE date(created_at) = date('now')").get();
     todayCount = result?.c || 0;
  } catch (e) {}
  
  const targetCount = isManual ? 1 : dailyLimit;
  if (!isManual && todayCount >= targetCount) {
    await notify('已达到每日抓取上限，跳过自动抓取任务。');
    return { success: false, message: '已达到每日获取上限。' };
  }

  await notify(`系统开始获取名画，本次计划获取 ${targetCount} 幅...`);
  const shuffledSources = [...SOURCES].sort(() => 0.5 - Math.random());
  let newlyAdded = 0;

  for (const source of shuffledSources) {
     if (newlyAdded >= targetCount || (!isManual && newlyAdded + todayCount >= targetCount)) break;
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
        if (newlyAdded >= targetCount || (!isManual && newlyAdded + todayCount >= targetCount)) break;
        try {
          const exists = await db.prepare('SELECT id FROM artworks WHERE source_id = ?').get(objData.sourceId);
          if (exists) continue;
        } catch(e) {}

        await notify(`精选名画: 《${objData.title}》 - ${objData.artistDisplayName}`);
        await notify(`💡 正在进行深度分析并转存资源...`);

        const artworkId = uuidv4();
        const r2Url = await uploadToR2(objData.primaryImage, artworkId);
        const aiData = await generateDetailedInterpretation(objData.title, objData.artistDisplayName, objData.objectDate || '未知年份', provider, modelId, apiKey);

        await db.prepare(`
          INSERT INTO artworks (id, source_id, title, artist, year, museum, image_url, source_url, ai_interpretation, keywords)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(artworkId, objData.sourceId, objData.title, objData.artistDisplayName, objData.objectDate, objData.repository, r2Url, objData.objectURL, aiData.content, aiData.keywords);

        newlyAdded++;
     }
  }
  return { success: true, count: newlyAdded };
}

async function generateDetailedInterpretation(title: string, artist: string, year: string, provider: string, modelId?: string, userApiKey?: string) {
  const prompt = `你是一位风趣幽默、见多识广、偶尔带点“凡尔赛”气息的顶级艺术策展人。
请为以下名画撰写一篇让人欲罢不能的深度赏析。
【创作要求】：
1. **讲故事，别讲课**：讲讲这幅画背后的轶事、画家的“槽点”或者那个时代的荒诞瞬间。
2. **幽默但专业**：在幽默中夹杂硬核艺术见解。
3. **金句频出**：每段建议包含一两个耐人寻味的段子或金句。
4. **排版优雅**：使用 HTML 标签（<h3>、<p>、<strong>）进行排版。
【待解读画作】：
名称：《${title}》
创作者：${artist}
创作年份：${year}
请严格按以下 JSON 格式输出：
{
  "keywords": "关键词1, 关键词2, 关键词3",
  "content": "...内容..."
}`;
  
  let aiInterpretation = "<p>未能生成详细解读。</p>";
  let keywords = "艺术, 名画";

  try {
     const aiKey = userApiKey;
     if (!aiKey) {
       return { keywords, content: "<p>尚未配置 API 密钥。请在管理员控制台设置 API 密钥以生成艺术解读。</p>" };
     }
     const ai = new GoogleGenAI({ apiKey: aiKey });
     const response = await ai.models.generateContent({
        model: modelId || 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
     });
     const text = response.text || "{}";
     let parsed: any = {};
     try {
       parsed = JSON.parse(text);
     } catch (e) {
       const jsonMatch = text.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) { }
       }
     }

     aiInterpretation = parsed.content || `<p>暂无解读内容。</p>`;
     keywords = parsed.keywords || keywords;
  } catch (e: any) {
     console.error('AI error:', e);
     aiInterpretation = `<p>解读生成失败：${e.message || '未知错误'}</p>`;
  }
  return { keywords, content: aiInterpretation };
}
