#!/usr/bin/env node
/** Minimal static file server for previewing dist/ locally. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const fallback = path.join(DIST, '404.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(fs.existsSync(fallback) ? fs.readFileSync(fallback) : 'Not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  })
  .listen(PORT, () => console.log(`Preview running at http://localhost:${PORT}/`));
