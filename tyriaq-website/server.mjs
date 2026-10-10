/* ==========================================================
   TYRIAQ CLUB — local server.
   Serves public/ and mounts the shared API core on /api/*, backed by
   the filesystem. The same core runs on Netlify backed by Blobs.
     node server.mjs [port]
   ========================================================== */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { handle, makeAccount, DEFAULT_CONTENT } from './lib/core.mjs';

const ROOT     = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC   = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const MEDIA    = path.join(PUBLIC, 'assets', 'img', 'uploads');
const PORT     = Number(process.argv[2] || process.env.PORT || 4200);

await fsp.mkdir(DATA_DIR, { recursive: true });
await fsp.mkdir(MEDIA, { recursive: true });

const jsonPath = key => path.join(DATA_DIR, `${key}.json`);
const writeAtomic = async (file, buf) => {
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, file);
};

/* session secret — generated once, kept out of git */
const SECRET_F = path.join(DATA_DIR, 'session-secret');
if (!fs.existsSync(SECRET_F)) {
  await fsp.writeFile(SECRET_F, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
}
const SECRET = (await fsp.readFile(SECRET_F, 'utf8')).trim();

/* admin account — created on first run, password printed once */
const ACCOUNT_F = path.join(DATA_DIR, 'admin.json');
let firstRunPassword = null;
if (!fs.existsSync(ACCOUNT_F)) {
  const user = process.env.TYRIAQ_ADMIN_USER || 'admin';
  const pass = process.env.TYRIAQ_ADMIN_PASS || crypto.randomBytes(9).toString('base64url');
  await fsp.writeFile(ACCOUNT_F, JSON.stringify(makeAccount(user, pass), null, 2), { mode: 0o600 });
  if (!process.env.TYRIAQ_ADMIN_PASS) firstRunPassword = pass;
}

const MIME_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
};

const store = {
  secureCookie: false,
  secret: async () => SECRET,
  account: async () => JSON.parse(await fsp.readFile(ACCOUNT_F, 'utf8')),
  setAccount: async acc => writeAtomic(ACCOUNT_F, JSON.stringify(acc, null, 2)),
  readJSON: async (key, fallback) => {
    try { return JSON.parse(await fsp.readFile(jsonPath(key), 'utf8')); }
    catch { return structuredClone(fallback); }
  },
  writeJSON: (key, value) => writeAtomic(jsonPath(key), JSON.stringify(value, null, 2)),
  mediaUrl: name => `assets/img/uploads/${name}`,
  putMedia: async (name, buf) => {
    await fsp.writeFile(path.join(MEDIA, name), buf);
    return { url: `assets/img/uploads/${name}` };
  },
  delMedia: async name => { await fsp.rm(path.join(MEDIA, name), { force: true }); },
  getMedia: async name => {
    try {
      const data = await fsp.readFile(path.join(MEDIA, name));
      return { data, type: MIME_BY_EXT[path.extname(name).slice(1).toLowerCase()] || 'application/octet-stream' };
    } catch { return null; }
  },
};

/* ---------- static ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};
const serveStatic = async (res, urlPath) => {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC + path.sep)) {          // never escape public/
    res.writeHead(403).end('403');
    return;
  }
  try {
    const st = await fsp.stat(file);
    if (st.isDirectory()) return serveStatic(res, rel + '/index.html');
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': st.size,
      'cache-control': rel.includes('/uploads/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
  }
};

const readBody = (req, limit = 9 * 1024 * 1024) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on('data', c => {
    size += c.length;
    if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      let body = Buffer.alloc(0);
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        try { body = await readBody(req); }
        catch { res.writeHead(413, { 'content-type': 'application/json' }).end('{"error":"الملف كبير جدًا."}'); return; }
      }
      const out = await handle({
        method: req.method,
        path: url.pathname.replace(/^\/api/, ''),
        headers: req.headers,
        body,
        ip: req.socket.remoteAddress || '?',
      }, store);
      res.writeHead(out.status, { ...out.headers, 'content-length': out.body.length });
      return res.end(out.body);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end('405');
      return;
    }
    return serveStatic(res, url.pathname === '/' ? '/index.html' : url.pathname);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' }).end('{"error":"خطأ في الخادم."}');
  }
});

/* A failed listen must not leave behind an account whose password was never shown. */
server.on('error', async err => {
  if (firstRunPassword) await fsp.rm(ACCOUNT_F, { force: true });
  console.error(err.code === 'EADDRINUSE'
    ? `\n  المنفذ ${PORT} مشغول. جرّب: node server.mjs ${PORT + 1}\n`
    : err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n  نادي ترياق — TyriaQ Club`);
  console.log(`  الموقع:        http://localhost:${PORT}/`);
  console.log(`  لوحة الإدارة:  http://localhost:${PORT}/admin.html`);
  if (firstRunPassword) {
    console.log(`\n  ⚠  حساب الإدارة أُنشئ الآن — احفظ هذه البيانات، لن تُعرض مرة أخرى:`);
    console.log(`     اسم المستخدم : admin`);
    console.log(`     كلمة السر    : ${firstRunPassword}`);
    console.log(`     (غيّرها من داخل اللوحة، أو احذف data/admin.json لإنشاء حساب جديد)\n`);
  } else console.log('');
});
