import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const mockApiPlugin = () => ({
  name: 'mock-api',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (!req.url?.startsWith('/api/')) return next();
      
      res.setHeader('Content-Type', 'application/json');
      
      // MOCK DATA LOGIC
      if (req.url === '/api/stats/visit' || req.method === 'POST') {
        if (req.url === '/api/auth/login') {
          return res.end(JSON.stringify({ success: true, token: 'mock-token' }));
        }
        if (req.url === '/api/admin/trigger-fetch') {
          res.setHeader('Content-Type', 'text/event-stream');
          res.write('data: {"type": "progress", "message": "模拟环境: 正在分析内容..."}\n\n');
          setTimeout(() => {
            res.end('data: {"type": "complete", "data": {"success": true, "message": "模拟环境: 抓取成功。"}} \n\n');
          }, 2000);
          return;
        }
        return res.end(JSON.stringify({ success: true }));
      }
      
      const mockArtwork = {
        id: '1',
        title: '星月夜 (Starry Night)',
        artist: '梵高 (Vincent van Gogh)',
        year: '1889',
        museum: '现代艺术博物馆 (MoMA)',
        image_url: 'https://images.metmuseum.org/CRDImages/ep/original/DP-19364-001.jpg', // Used a met image for placeholder
        ai_interpretation: '<p>在这个充满活力的星空下...</p>',
        keywords: ['梵高', '星空', '后印象派'],
        views: 42,
        created_at: new Date().toISOString()
      };

      if (req.url.match(/^\/api\/artworks\/\w+$/)) {
        return res.end(JSON.stringify(mockArtwork));
      }

      if (req.url === '/api/artworks' || req.url.startsWith('/api/artworks?')) {
        return res.end(JSON.stringify([mockArtwork, { ...mockArtwork, id: '2', title: '戴珍珠耳环的少女', artist: '维米尔' }]));
      }

      if (req.url === '/api/stats') {
        return res.end(JSON.stringify({ artworks: 2, visits: 999 }));
      }
      
      if (req.url === '/api/keywords') {
        return res.end(JSON.stringify(['梵高', '后印象派', '古典主义']));
      }

      if (req.url === '/api/auth/check') {
        return res.end(JSON.stringify({ isAdmin: true }));
      }
      
      if (req.url === '/api/admin/settings') {
        return res.end(JSON.stringify({ ai_provider: 'gemini', daily_limit: '5' }));
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Mock route not implemented' }));
    });
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), mockApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
