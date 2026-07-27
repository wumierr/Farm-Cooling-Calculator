/**
 * static-server.cjs — 零依赖静态文件服务器（只用 Node 内置模块）
 *
 * 用法:
 *   node scripts/static-server.cjs [port] [rootDir]
 *
 * 默认端口 3000，默认根目录 = <项目根>/out（next build 静态导出的产物）。
 * 用途: 本地预览"静态导出版"，行为和 Cloudflare Pages / nginx 上线后一致。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.argv[2], 10) || 3000;
const ROOT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'out'));
const HOST = process.env.BIND_HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
};

if (!fs.existsSync(ROOT)) {
  console.error(`[ERROR] 目录不存在: ${ROOT}`);
  console.error(`[ERROR] 先执行静态构建: powershell -File scripts\\build-static.ps1`);
  process.exit(3);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (e) {
    res.writeHead(400); return res.end('Bad Request');
  }

  let filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  // 依次尝试: 原路径 -> 原路径/index.html -> 原路径.html -> 根 index.html
  const candidates = [filePath];
  if (!path.extname(filePath)) {
    candidates.push(path.join(filePath, 'index.html'));
    candidates.push(filePath + '.html');
  }
  candidates.push(path.join(ROOT, 'index.html'));

  for (const c of candidates) {
    try {
      const st = fs.statSync(c);
      if (st.isFile()) {
        const ext = path.extname(c).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        });
        return fs.createReadStream(c).pipe(res);
      }
    } catch (e) { /* 试下一个 */ }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`404 Not Found: ${pathname}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`[ERROR] 端口 ${PORT} 已被占用`); process.exit(2); }
  console.error('[ERROR]', err.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[static-server] root = ${ROOT}`);
  console.log(`[static-server] http://localhost:${PORT}`);
});
