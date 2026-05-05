import { getCloudEnv, setCloudEnv } from './api/_cloud-env';

export async function onRequest(context: any) {
  try {
    setCloudEnv(context.env);
    const env = getCloudEnv();
    const baseUrl = (env.APP_URL || 'https://art.fanso.site').replace(/\/$/, "");

    const txt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error: any) {
    return new Response(`Error generating robots.txt: ${error.message}`, { status: 500 });
  }
}
