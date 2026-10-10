/* ==========================================================
   TYRIAQ CLUB — API core.
   One set of routes, two backends: a local Node server backed by the
   filesystem, and a Netlify Function backed by Netlify Blobs. The only
   difference is the `store` adapter handed in.

   store must provide:
     readJSON(key, fallback)   -> object
     writeJSON(key, value)     -> void
     putMedia(name, buf, type) -> { url }
     delMedia(name)            -> void
     mediaUrl(name)            -> string
   ========================================================== */
import crypto from 'node:crypto';
import { buildXlsx } from './xlsx.mjs';

export const TEAMS = [
  'الفرع العلمي',
  'الفرع الثقافي',
  'الفرع التطوعي',
  'فريق الميديا',
  'فريق الموارد',
  'فريق العلاقات',
];

export const DEFAULT_CONTENT = {
  branches: [
    { key: 'sci', num: '01', title: 'الفرع العلمي', lat: 'SCIENTIFIC BRANCH',
      lead: 'البحث، الدليل، الفضول، والابتكار. هنا يتحوّل السؤال إلى منهج، والفضول إلى تجربة قابلة للعرض والنقاش.',
      chips: ['بحث', 'دليل', 'فضول', 'ابتكار'], programs: [] },
    { key: 'vol', num: '02', title: 'الفرع التطوعي', lat: 'VOLUNTARY BRANCH',
      lead: 'الخدمة، التضامن، والأثر في المجتمع. هنا تغادر المعرفة القاعة وتعود إلى الناس الذين جاءت من أجلهم.',
      chips: ['خدمة', 'تضامن', 'ميدان', 'أثر'], programs: [] },
    { key: 'cul', num: '03', title: 'الفرع الثقافي', lat: 'CULTURAL BRANCH',
      lead: 'التعليم، الإبداع، والتنمية الفكرية. هنا يُبنى الطالب ككل — لا كتخصّص واحد ينتهي عند المقرّر.',
      chips: ['تعليم', 'إبداع', 'تعبير', 'تنمية'], programs: [] },
  ],
  logos: {},
};

const MAX_UPLOAD = 8 * 1024 * 1024;
const SESSION_MS = 12 * 60 * 60 * 1000;

export const clean = (v, max = 400) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const hash = (pass, salt) => crypto.scryptSync(String(pass), salt, 64).toString('hex');
const same = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

/* ---------- responses ---------- */
const J = (status, body, headers = {}) => ({
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  body: Buffer.from(JSON.stringify(body), 'utf8'),
});
const ERR = (status, msg) => J(status, { error: msg });

/* ---------- sessions ---------- */
const sign = (secret, v) => crypto.createHmac('sha256', secret).update(v).digest('base64url');
const makeToken = (secret, user) => {
  const body = `${Buffer.from(user).toString('base64url')}.${Date.now() + SESSION_MS}`;
  return `${body}.${sign(secret, body)}`;
};
const readToken = (secret, tok) => {
  if (!tok) return null;
  const i = tok.lastIndexOf('.');
  if (i < 0) return null;
  const body = tok.slice(0, i), sig = tok.slice(i + 1);
  if (!same(sig, sign(secret, body))) return null;
  const [u, exp] = body.split('.');
  if (!u || !exp || Number(exp) < Date.now()) return null;
  return Buffer.from(u, 'base64url').toString();
};
const cookieOf = (header, name) => {
  const hit = (header || '').split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

/* ---------- multipart ---------- */
const parseMultipart = (buf, boundary) => {
  const sep = Buffer.from(`--${boundary}`);
  const parts = [];
  let i = buf.indexOf(sep);
  while (i !== -1) {
    const start = i + sep.length;
    if (buf.slice(start, start + 2).toString() === '--') break;
    const next = buf.indexOf(sep, start);
    if (next === -1) break;
    let chunk = buf.slice(start, next);
    if (chunk.slice(0, 2).toString() === '\r\n') chunk = chunk.slice(2);
    if (chunk.slice(-2).toString() === '\r\n') chunk = chunk.slice(0, -2);
    const hEnd = chunk.indexOf('\r\n\r\n');
    if (hEnd !== -1) {
      const head = chunk.slice(0, hEnd).toString('utf8');
      const data = chunk.slice(hEnd + 4);
      const name = /name="([^"]*)"/i.exec(head)?.[1];
      const filename = /filename="([^"]*)"/i.exec(head)?.[1];
      if (name) parts.push({ name, filename, data });
    }
    i = next;
  }
  return parts;
};

/* Trust the bytes, not the sent name or MIME type. */
const KINDS = [
  { ext: 'png',  type: 'image/png',     test: b => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg',  type: 'image/jpeg',    test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif',  type: 'image/gif',     test: b => ['GIF89a', 'GIF87a'].includes(b.slice(0, 6).toString()) },
  { ext: 'webp', type: 'image/webp',    test: b => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  { ext: 'svg',  type: 'image/svg+xml', test: b => /^\s*(<\?xml|<svg)/i.test(b.slice(0, 200).toString('utf8')) },
];
export const sniff = b => KINDS.find(k => { try { return k.test(b); } catch { return false; } }) || null;

/* ---------- throttles (per process; good enough for a club site) ---------- */
const loginTries = new Map();
const joinSeen = new Map();

/* ==========================================================
   handle({ method, path, headers, body, ip }, store) -> { status, headers, body }
   ========================================================== */
export async function handle(req, store) {
  const { method, path: p, headers = {}, body = Buffer.alloc(0), ip = '?' } = req;
  const cookieHeader = headers.cookie || headers.Cookie || '';

  const secret = await store.secret();
  const account = await store.account();          // { user, salt, hash } | null
  const asJSON = () => (body.length ? JSON.parse(body.toString('utf8')) : {});
  const isAdmin = () => !!readToken(secret, cookieOf(cookieHeader, 'tyriaq_session'));

  /* ---------- public ---------- */
  if (p === '/content' && method === 'GET') {
    return J(200, await store.readJSON('content', DEFAULT_CONTENT));
  }
  if (p === '/teams' && method === 'GET') return J(200, { teams: TEAMS });

  /* Booleans only — never the values. Tells you whether the deploy actually
     picked up the environment variables, which is the usual reason a fresh
     Netlify site cannot log in. */
  if (p === '/health' && method === 'GET') {
    return J(200, {
      ok: true,
      accountConfigured: !!account,
      env: {
        TYRIAQ_ADMIN_USER: !!process.env.TYRIAQ_ADMIN_USER,
        TYRIAQ_ADMIN_PASS: !!process.env.TYRIAQ_ADMIN_PASS,
        TYRIAQ_SECRET: !!process.env.TYRIAQ_SECRET,
      },
      node: process.version,
    });
  }

  if (p === '/join' && method === 'POST') {
    if (Date.now() - (joinSeen.get(ip) || 0) < 60_000) {
      return ERR(429, 'انتظر دقيقة قبل إرسال طلب آخر.');
    }
    let b;
    try { b = asJSON(); } catch { return ERR(400, 'طلب غير صحيح.'); }
    if (clean(b.website, 50)) return J(200, { ok: true });   // honeypot

    const first = clean(b.first, 60);
    const last = clean(b.last, 60);
    const phone = clean(b.phone, 30);
    const talents = clean(b.talents, 600);
    const teams = Array.isArray(b.teams)
      ? [...new Set(b.teams.map(t => clean(t, 40)))].filter(t => TEAMS.includes(t))
      : [];

    if (!first || !last) return ERR(400, 'الاسم واللقب مطلوبان.');
    if (!/^[+\d][\d\s()-]{5,}$/.test(phone)) return ERR(400, 'رقم الهاتف غير صحيح.');
    if (!teams.length) return ERR(400, 'اختر فرعًا أو فريقًا واحدًا على الأقل.');

    const joins = await store.readJSON('joins', { entries: [] });
    joins.entries.push({ id: crypto.randomUUID(), at: new Date().toISOString(), first, last, phone, talents, teams });
    await store.writeJSON('joins', joins);
    joinSeen.set(ip, Date.now());
    return J(201, { ok: true });
  }

  /* ---------- auth ---------- */
  if (p === '/login' && method === 'POST') {
    if (!account) {
      return ERR(503, 'لم يُضبط حساب الإدارة بعد. اضبط TYRIAQ_ADMIN_USER و TYRIAQ_ADMIN_PASS '
        + 'بقيمة واحدة لكل السياقات، ثم أعد النشر (Deploys → Trigger deploy) — '
        + 'المتغيّرات لا تصل إلى الدالّة قبل نشر جديد.');
    }
    const a = loginTries.get(ip);
    if (a && Date.now() - a.at < 15 * 60_000 && a.n >= 8) {
      return ERR(429, 'محاولات كثيرة — انتظر ربع ساعة.');
    }
    const { user, pass } = asJSON();
    const ok = String(user ?? '') === account.user && same(hash(pass ?? '', account.salt), account.hash);
    if (!ok) {
      const t = loginTries.get(ip) || { n: 0 };
      loginTries.set(ip, { n: t.n + 1, at: Date.now() });
      return ERR(401, 'اسم المستخدم أو كلمة السر غير صحيحة.');
    }
    loginTries.delete(ip);
    return J(200, { ok: true, user: account.user }, {
      'set-cookie': `tyriaq_session=${makeToken(secret, account.user)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${store.secureCookie ? '; Secure' : ''}`,
    });
  }
  if (p === '/logout' && method === 'POST') {
    return J(200, { ok: true }, { 'set-cookie': 'tyriaq_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (p === '/me' && method === 'GET') {
    return J(200, { user: readToken(secret, cookieOf(cookieHeader, 'tyriaq_session')), configured: !!account });
  }

  /* media is public by design — the pages embed these URLs */
  const mImg = /^\/img\/([\w.-]+)$/.exec(p);
  if (mImg && (method === 'GET' || method === 'HEAD')) {
    const hit = await store.getMedia(mImg[1]);
    if (!hit) return ERR(404, 'not found');
    return {
      status: 200,
      headers: { 'content-type': hit.type, 'cache-control': 'public, max-age=31536000, immutable' },
      body: hit.data,
    };
  }

  /* ---------- everything below needs the admin session ---------- */
  if (!isAdmin()) return ERR(401, 'يلزم تسجيل الدخول.');

  if (p === '/password' && method === 'POST') {
    const { current, next } = asJSON();
    if (!same(hash(current ?? '', account.salt), account.hash)) {
      return ERR(400, 'كلمة السر الحالية غير صحيحة.');
    }
    if (String(next ?? '').length < 8) return ERR(400, 'كلمة السر الجديدة: 8 محارف على الأقل.');
    const salt = crypto.randomBytes(16).toString('hex');
    await store.setAccount({ user: account.user, salt, hash: hash(next, salt) });
    return J(200, { ok: true });
  }

  if (p === '/upload' && method === 'POST') {
    const ct = headers['content-type'] || headers['Content-Type'] || '';
    const bnd = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
    if (!bnd) return ERR(400, 'صيغة الرفع غير صحيحة.');
    const parts = parseMultipart(body, bnd[1] || bnd[2]);
    const file = parts.find(x => x.filename);
    if (!file || !file.data.length) return ERR(400, 'لا يوجد ملف.');
    if (file.data.length > MAX_UPLOAD) return ERR(413, 'الملف أكبر من 8 ميغابايت.');
    const kind = sniff(file.data);
    if (!kind) return ERR(415, 'الملف ليس صورة (PNG / JPG / WEBP / GIF / SVG).');

    const slot = parts.find(x => x.name === 'slot')?.data.toString('utf8').trim();
    const name = (slot === 'logo' || slot === 'logo-white')
      ? `${slot}.${kind.ext}`
      : `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}.${kind.ext}`;

    if (slot === 'logo' || slot === 'logo-white') {
      for (const e of ['svg', 'png', 'webp', 'jpg', 'gif']) {
        if (`${slot}.${e}` !== name) await store.delMedia(`${slot}.${e}`);
      }
    }
    const { url } = await store.putMedia(name, file.data, kind.type);
    if (slot === 'logo' || slot === 'logo-white') {
      const c = await store.readJSON('content', DEFAULT_CONTENT);
      c.logos = { ...(c.logos || {}), [slot]: `${url}?v=${Date.now()}` };
      await store.writeJSON('content', c);
      return J(200, { ok: true, url: c.logos[slot] });
    }
    return J(200, { ok: true, url });
  }

  /* ---------- join requests ---------- */
  if (p === '/joins' && method === 'GET') {
    const joins = await store.readJSON('joins', { entries: [] });
    return J(200, { entries: [...joins.entries].reverse(), teams: TEAMS });
  }
  const mJoin = /^\/joins\/([\w-]+)$/.exec(p);
  if (mJoin && method === 'DELETE') {
    const joins = await store.readJSON('joins', { entries: [] });
    const i = joins.entries.findIndex(e => e.id === mJoin[1]);
    if (i < 0) return ERR(404, 'طلب غير موجود.');
    joins.entries.splice(i, 1);
    await store.writeJSON('joins', joins);
    return J(200, { ok: true });
  }
  if ((p === '/joins.xlsx' || p === '/joins.csv') && method === 'GET') {
    const joins = await store.readJSON('joins', { entries: [] });
    const head = ['التاريخ', 'الاسم', 'اللقب', 'رقم الهاتف', 'المواهب', 'الفروع والفرق'];
    const rows = joins.entries.map(e => {
      const d = new Date(e.at), z = n => String(n).padStart(2, '0');
      return [`${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}`,
        e.first, e.last, e.phone, e.talents, (e.teams || []).join(' / ')];
    });
    const stamp = new Date().toISOString().slice(0, 10);

    if (p.endsWith('.csv')) {
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      /* the BOM is what makes Excel read the Arabic as UTF-8 */
      const csv = '﻿' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n');
      return {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="tyriaq-joins-${stamp}.csv"`,
        },
        body: Buffer.from(csv, 'utf8'),
      };
    }
    return {
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="tyriaq-joins-${stamp}.xlsx"`,
      },
      body: buildXlsx([head, ...rows], 'طلبات الانضمام'),
    };
  }

  /* ---------- content ---------- */
  const content = await store.readJSON('content', DEFAULT_CONTENT);
  const branchOf = k => content.branches.find(b => b.key === k);

  const mBranch = /^\/branches\/([a-z]+)$/.exec(p);
  if (mBranch && method === 'PUT') {
    const b = branchOf(mBranch[1]);
    if (!b) return ERR(404, 'فرع غير موجود.');
    const body_ = asJSON();
    if (body_.title !== undefined) b.title = clean(body_.title, 80);
    if (body_.lat !== undefined) b.lat = clean(body_.lat, 80);
    if (body_.lead !== undefined) b.lead = clean(body_.lead, 600);
    if (Array.isArray(body_.chips)) b.chips = body_.chips.map(c => clean(c, 30)).filter(Boolean).slice(0, 8);
    await store.writeJSON('content', content);
    return J(200, b);
  }

  if (p === '/programs' && method === 'POST') {
    const body_ = asJSON();
    const b = branchOf(String(body_.branch ?? ''));
    if (!b) return ERR(400, 'اختر فرعًا.');
    const item = {
      id: crypto.randomUUID(),
      title: clean(body_.title, 120),
      desc: clean(body_.desc, 400),
      tag: clean(body_.tag, 40),
      image: clean(body_.image, 300),
    };
    if (!item.title) return ERR(400, 'العنوان مطلوب.');
    b.programs.push(item);
    await store.writeJSON('content', content);
    return J(201, item);
  }

  const mProg = /^\/programs\/([\w-]+)$/.exec(p);
  if (mProg) {
    const id = mProg[1];
    const b = content.branches.find(x => x.programs.some(y => y.id === id));
    if (!b) return ERR(404, 'نشاط غير موجود.');
    const item = b.programs.find(y => y.id === id);

    if (method === 'PUT') {
      const body_ = asJSON();
      if (body_.title !== undefined) item.title = clean(body_.title, 120);
      if (body_.desc !== undefined) item.desc = clean(body_.desc, 400);
      if (body_.tag !== undefined) item.tag = clean(body_.tag, 40);
      if (body_.image !== undefined) item.image = clean(body_.image, 300);
      if (body_.branch && body_.branch !== b.key) {
        const to = branchOf(String(body_.branch));
        if (to) { b.programs.splice(b.programs.indexOf(item), 1); to.programs.push(item); }
      }
      await store.writeJSON('content', content);
      return J(200, item);
    }
    if (method === 'DELETE') {
      b.programs.splice(b.programs.indexOf(item), 1);
      await store.writeJSON('content', content);
      /* drop the image too, unless another programme still points at it */
      const stillUsed = content.branches.some(x => x.programs.some(y => y.image === item.image));
      const name = /([\w.-]+)$/.exec((item.image || '').split('?')[0])?.[1];
      if (item.image && !stillUsed && name && !name.startsWith('logo')) await store.delMedia(name);
      return J(200, { ok: true });
    }
  }

  if (p === '/reorder' && method === 'POST') {
    const { branch, ids } = asJSON();
    const b = branchOf(String(branch ?? ''));
    if (!b || !Array.isArray(ids)) return ERR(400, 'طلب غير صحيح.');
    const byId = new Map(b.programs.map(x => [x.id, x]));
    b.programs = ids.map(i => byId.get(i)).filter(Boolean)
      .concat(b.programs.filter(x => !ids.includes(x.id)));
    await store.writeJSON('content', content);
    return J(200, { ok: true });
  }

  return ERR(404, 'not found');
}

/* Build the {user,salt,hash} record the core expects from a plain password. */
export const makeAccount = (user, pass) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return { user, salt, hash: hash(pass, salt) };
};
