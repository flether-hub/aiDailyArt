console.log('Starting server in', process.env.NODE_ENV, 'mode...');
import express from "express";
import { createServer as createViteServer } from "vite";
import { getRequestListener } from "@hono/node-server";
import apiApp from "./functions/api/[[path]].ts";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const honoHandler = getRequestListener(apiApp.fetch);
  app.use("/api", (req, res, next) => {
    req.url = req.originalUrl || req.url;
    Promise.resolve(honoHandler(req, res)).catch(next);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
