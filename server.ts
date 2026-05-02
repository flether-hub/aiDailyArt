import express from 'express';
import { createServer as createViteServer } from 'vite';
import { handle } from '@hono/node-server';
import path from 'path';
import app from './src/server/app';

async function startServer() {
  const server = express();
  const PORT = 3000;

  // Hono API Handler
  const honoHandler = handle(app);

  // API Routes - Mount Hono (which already has /api base path)
  server.all('/api/*', (req, res) => {
    honoHandler(req, res);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    server.use(express.static(distPath));
    server.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
