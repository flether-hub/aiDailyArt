import { createServer } from 'http';
import { getRequestListener } from '@hono/node-server';
import { createServer as createViteServer } from 'vite';
import app from './src/server/app';
import { getDB, initDB } from './src/server/db';

const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function start() {
  // Initialize DB once
  const db = getDB();
  await initDB(db);

  const handler = getRequestListener(app.fetch);
  let vite: any;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  const server = createServer((req, res) => {
    if (req.url?.startsWith('/api')) {
      handler(req, res);
    } else {
      if (isProd) {
        // Simple production fallback or static serving could go here
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        vite.middlewares(req, res);
      }
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
