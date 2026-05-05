import { getDB, initDB } from './api/_db';
import { getCloudEnv, setCloudEnv } from './api/_cloud-env';

export async function onRequest(context: any) {
  try {
    setCloudEnv(context.env);
    const db = await getDB();
    await initDB(db);

    const env = getCloudEnv();
    // Default to the provided APP_URL or a safe fallback
    const baseUrl = (env.APP_URL || 'https://art.fanso.site').replace(/\/$/, "");

    const artworks = await db.prepare('SELECT id, created_at FROM artworks ORDER BY created_at DESC').all();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Home
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    (artworks || []).forEach((art: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/artwork/${art.id}</loc>\n`;
      try {
        const d = new Date(art.created_at ? art.created_at + (art.created_at.endsWith("Z") ? "" : "Z") : Date.now());
        xml += `    <lastmod>${d.toISOString().split('T')[0]}</lastmod>\n`;
      } catch (e) {
        // ignore invalid date
      }
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error: any) {
    return new Response(`Error generating sitemap: ${error.message}`, { status: 500 });
  }
}
