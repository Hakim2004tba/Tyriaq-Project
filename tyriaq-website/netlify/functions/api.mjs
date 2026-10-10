/* ==========================================================
   TYRIAQ CLUB — Netlify Function.
   Same routes as the local server (lib/core.mjs); storage is Netlify Blobs
   instead of the filesystem, because a Function has no disk that survives.
   ========================================================== */
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { handle, makeAccount, DEFAULT_CONTENT } from '../../lib/core.mjs';

const docs  = () => getStore({ name: 'tyriaq', consistency: 'strong' });
const media = () => getStore({ name: 'tyriaq-media', consistency: 'strong' });

const store = {
  secureCookie: true,                       // Netlify is always HTTPS

  /* Prefer an env var; otherwise mint one and keep it so sessions survive
     between cold starts. */
  secret: async () => {
    if (process.env.TYRIAQ_SECRET) return process.env.TYRIAQ_SECRET;
    const s = docs();
    const found = await s.get('secret');
    if (found) return found;
    const fresh = crypto.randomBytes(32).toString('hex');
    await s.set('secret', fresh);
    return fresh;
  },

  /* A password changed from the panel is stored and wins over the env var. */
  account: async () => {
    const stored = await docs().get('account', { type: 'json' });
    if (stored) return stored;
    const user = process.env.TYRIAQ_ADMIN_USER;
    const pass = process.env.TYRIAQ_ADMIN_PASS;
    if (!user || !pass) return null;
    return makeAccount(user, pass);
  },
  setAccount: acc => docs().setJSON('account', acc),

  readJSON: async (key, fallback) => (await docs().get(key, { type: 'json' })) ?? structuredClone(fallback),
  writeJSON: (key, value) => docs().setJSON(key, value),

  mediaUrl: name => `/api/img/${name}`,
  putMedia: async (name, buf, type) => {
    await media().set(name, buf, { metadata: { type } });
    return { url: `/api/img/${name}` };
  },
  delMedia: async name => { try { await media().delete(name); } catch { /* already gone */ } },
  getMedia: async name => {
    const res = await media().getWithMetadata(name, { type: 'arrayBuffer' });
    if (!res) return null;
    return { data: Buffer.from(res.data), type: res.metadata?.type || 'application/octet-stream' };
  },
};

export default async (request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/\.netlify\/functions\/api/, '') || '/';

  const headers = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  const body = (request.method === 'GET' || request.method === 'HEAD')
    ? Buffer.alloc(0)
    : Buffer.from(await request.arrayBuffer());

  const ip = headers['x-nf-client-connection-ip'] || headers['x-forwarded-for']?.split(',')[0].trim() || '?';

  try {
    const out = await handle({ method: request.method, path, headers, body, ip }, store);
    return new Response(out.body, { status: out.status, headers: out.headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'خطأ في الخادم.' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
};

export const config = { path: '/api/*' };
