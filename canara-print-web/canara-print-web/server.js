// Canara Print - Web server (browser version)
// Developed By Aryaman Digital Studio
//
// Customer page  : /            (QR scan -> upload, no login)
// Owner dashboard: /owner       (protected by OWNER_PIN)
//
// Only 2 npm packages (sharp, pdf-lib). No express/multer: tiny install.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

sharp.cache(false);
sharp.concurrency(1); // small free servers have little RAM

const PORT = process.env.PORT || 3000;
const OWNER_PIN = String(process.env.OWNER_PIN || '');
const SHOP_NAME = process.env.SHOP_NAME || 'Canara Print';
const DATA = process.env.DATA_DIR || path.join(os.tmpdir(), 'canara-print');
const FILES = path.join(DATA, 'files');
const PUBLIC = path.join(__dirname, 'public');

const MAX_FILE = 25 * 1024 * 1024;
const MAX_BODY = 80 * 1024 * 1024;
const MAX_FILES = 15;
const A4 = [595.28, 841.89];

fs.mkdirSync(FILES, { recursive: true });
for (const f of fs.readdirSync(FILES)) fs.unlink(path.join(FILES, f), () => {}); // never keep customer files across restarts

const orders = new Map();
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// ---------------------------------------------------------------- helpers
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function clientIp(req) {
  const x = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return x.length ? x[x.length - 1] : req.socket.remoteAddress || '?'; // last hop = added by our own proxy, can't be spoofed
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const len = parseInt(req.headers['content-length'] || '0', 10);
    if (len > limit) { req.resume(); return reject({ status: 413 }); }
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { req.destroy(); return reject({ status: 413 }); }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => reject({ status: 400 }));
  });
}

// Minimal multipart/form-data parser (binary safe)
function parseMultipart(buf, boundary) {
  const delim = Buffer.from('--' + boundary);
  const fields = {};
  const files = [];
  let pos = buf.indexOf(delim);
  while (pos !== -1) {
    const start = pos + delim.length;
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break; // closing "--"
    const hdrStart = start + 2; // skip CRLF
    const hdrEnd = buf.indexOf('\r\n\r\n', hdrStart);
    if (hdrEnd === -1) break;
    const next = buf.indexOf(delim, hdrEnd + 4);
    if (next === -1) break;
    const head = buf.slice(hdrStart, hdrEnd).toString('utf8');
    const data = buf.slice(hdrEnd + 4, next - 2); // drop CRLF before next delimiter
    const name = (head.match(/name="([^"]*)"/i) || [])[1];
    const filename = (head.match(/filename="([^"]*)"/i) || [])[1];
    const type = ((head.match(/content-type:\s*([^\r\n;]+)/i) || [])[1] || '').trim().toLowerCase();
    if (name !== undefined) {
      if (filename !== undefined) files.push({ name, filename, type, data });
      else fields[name] = data.toString('utf8');
    }
    pos = next;
  }
  return { fields, files };
}

// ---------------------------------------------------------------- owner auth (PIN -> signed cookie)
const hash = (s) => crypto.createHash('sha256').update(s).digest();
const SECRET = hash('canara-print|' + OWNER_PIN);
const sign = (exp) => crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex');
function makeToken() { const exp = Date.now() + 30 * 24 * 3600e3; return exp + '.' + sign(exp); }
function isOwner(req) {
  if (!OWNER_PIN) return false;
  const m = /(?:^|;\s*)cp_owner=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return good.length === got.length && crypto.timingSafeEqual(good, got);
}
const tries = new Map(); // ip -> [timestamps]
function tooManyTries(ip) {
  const now = Date.now();
  const a = (tries.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  tries.set(ip, a);
  return a.length >= 10;
}

// ---------------------------------------------------------------- document processing
async function addImage(pdf, buf, { color, enhance }) {
  let base = await sharp(buf, { failOn: 'none' }).rotate().toBuffer(); // fix phone rotation (EXIF)

  if (enhance) {
    // auto-crop: remove plain borders / table around the document
    try {
      const m0 = await sharp(base).metadata();
      const t = await sharp(base).trim({ threshold: 35 }).toBuffer({ resolveWithObject: true });
      if (t.info.width * t.info.height > m0.width * m0.height * 0.4) {
        const m = Math.round(Math.min(t.info.width, t.info.height) * 0.03); // small white margin
        base = await sharp(t.data).extend({ top: m, bottom: m, left: m, right: m, background: '#ffffff' }).toBuffer();
      }
    } catch (_) { /* keep original */ }
  }

  // stretch contrast only when the photo really has some (a flat/blank page would turn dark otherwise)
  let stretch = false;
  if (enhance) {
    try {
      const ch = (await sharp(base).flatten({ background: '#ffffff' }).greyscale().stats()).channels[0];
      stretch = ch.max - ch.min >= 60 && ch.stdev > 12;
    } catch (_) { /* skip stretch */ }
  }

  let p = sharp(base).resize({ width: 2100, height: 2970, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' });
  if (color === 'bw') p = p.greyscale();
  if (enhance) {
    if (stretch) p = p.normalise();
    p = p.sharpen({ sigma: 1 }).linear(1.1, -8);
  }
  const jpg = await p.jpeg({ quality: 88 }).toBuffer();
  const emb = await pdf.embedJpg(jpg);
  const landscape = emb.width > emb.height;
  const [pw, ph] = landscape ? [A4[1], A4[0]] : A4;
  const s = Math.min(pw / emb.width, ph / emb.height);
  const w = emb.width * s;
  const h = emb.height * s;
  const page = pdf.addPage([pw, ph]);
  page.drawImage(emb, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
}

// ---------------------------------------------------------------- routes
const uploadHits = new Map();
async function handleUpload(req, res) {
  const ip = clientIp(req);
  const now = Date.now();
  const arr = (uploadHits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (arr.length >= 40) return json(res, 429, { error: 'Bahut zyada upload, thodi der baad try karo' });
  arr.push(now);
  uploadHits.set(ip, arr);

  const ct = req.headers['content-type'] || '';
  const bm = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
  if (!/multipart\/form-data/i.test(ct) || !bm) return json(res, 400, { error: 'Galat request' });

  let parsed;
  try { parsed = parseMultipart(await readBody(req, MAX_BODY), bm[1] || bm[2]); }
  catch (e) { return json(res, e.status || 400, { error: e.status === 413 ? 'Files bahut badi hain (kul 80 MB tak)' : 'Upload adhura reh gaya, dobara try karo' }); }

  const files = parsed.files.filter((f) => f.name === 'files' && f.data.length);
  const f = parsed.fields;
  if (!files.length) return json(res, 400, { error: 'Koi file nahi mili' });
  if (files.length > MAX_FILES) return json(res, 400, { error: 'Ek baar me 15 file tak' });
  if (files.some((x) => x.data.length > MAX_FILE)) return json(res, 413, { error: 'Ek file 25 MB se badi hai' });

  try {
    const opts = { color: f.color === 'color' ? 'color' : 'bw', enhance: f.enhance !== '0' };
    const pdf = await PDFDocument.create();
    for (const file of files) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.filename) || file.data.slice(0, 5).toString() === '%PDF-';
      if (isPdf) {
        const src = await PDFDocument.load(file.data, { ignoreEncryption: true });
        (await pdf.copyPages(src, src.getPageIndices())).forEach((pg) => pdf.addPage(pg));
      } else {
        await addImage(pdf, file.data, opts);
      }
    }
    if (pdf.getPageCount() > 200) return json(res, 400, { error: 'Bahut zyada page (200 se kam rakhiye)' });
    const id = crypto.randomBytes(8).toString('hex');
    fs.writeFileSync(path.join(FILES, id + '.pdf'), await pdf.save());
    const order = {
      id,
      code: String(crypto.randomInt(1000, 10000)),
      name: String(f.name || 'Customer').replace(/[<>]/g, '').slice(0, 40) || 'Customer',
      pages: pdf.getPageCount(),
      copies: clamp(parseInt(f.copies, 10) || 1, 1, 50),
      color: opts.color,
      duplex: f.duplex === '1',
      status: 'pending',
      created: Date.now(),
    };
    orders.set(id, order);
    json(res, 200, { id, code: order.code, pages: order.pages });
  } catch (e) {
    console.error('upload error:', e && e.message);
    json(res, 500, { error: 'File process nahi ho payi. Dusri file try karo.' });
  }
}

function finish(id, status) {
  const o = orders.get(id);
  if (!o) return false;
  o.status = status;
  o.finished = Date.now();
  fs.unlink(path.join(FILES, id + '.pdf'), () => {}); // customer's file is deleted right after use
  return true;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/owner') pathname = '/owner.html';
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (_) { res.writeHead(400); return res.end(); }
  const file = path.normalize(path.join(PUBLIC, rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nahi mila'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': rel.startsWith('/vendor/') ? 'public, max-age=604800' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;
  try {
    if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
    if (p === '/api/info' && m === 'GET') return json(res, 200, { name: SHOP_NAME });

    // ---- customer
    if (p === '/api/upload' && m === 'POST') return await handleUpload(req, res);
    let mm = /^\/api\/status\/([a-f0-9]{16})$/.exec(p);
    if (mm && m === 'GET') {
      const o = orders.get(mm[1]);
      return json(res, 200, { status: o ? o.status : 'gone' });
    }

    // ---- owner
    if (p === '/api/owner/login' && m === 'POST') {
      if (!OWNER_PIN) return json(res, 503, { error: 'Server par OWNER_PIN set nahi hai (README dekhiye)' });
      const ip = clientIp(req);
      if (tooManyTries(ip)) return json(res, 429, { error: 'Bahut galat koshish. 10 minute baad try karo.' });
      let pin = '';
      try { pin = String(JSON.parse((await readBody(req, 2000)).toString() || '{}').pin || ''); } catch (_) {}
      if (!crypto.timingSafeEqual(hash(pin), hash(OWNER_PIN))) {
        tries.get(ip).push(Date.now());
        return json(res, 401, { error: 'PIN galat hai' });
      }
      const secure = String(req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
      res.setHeader('Set-Cookie', `cp_owner=${makeToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${secure}`);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/owner/logout' && m === 'POST') {
      res.setHeader('Set-Cookie', 'cp_owner=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return json(res, 200, { ok: true });
    }
    if (p.startsWith('/api/owner/')) {
      if (!isOwner(req)) return json(res, 401, { error: 'login' });
      if (p === '/api/owner/orders' && m === 'GET') {
        const list = [...orders.values()].filter((o) => o.status === 'pending').sort((a, b) => a.created - b.created);
        return json(res, 200, { name: SHOP_NAME, orders: list });
      }
      mm = /^\/api\/owner\/orders\/([a-f0-9]{16})\/(file|done|reject)$/.exec(p);
      if (mm) {
        const [, id, act] = mm;
        const o = orders.get(id);
        if (!o) return json(res, 404, { error: 'Order nahi mila' });
        if (act === 'file' && m === 'GET') {
          const f = path.join(FILES, id + '.pdf');
          if (o.status !== 'pending' || !fs.existsSync(f)) return json(res, 404, { error: 'File ab nahi hai' });
          res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'Content-Length': fs.statSync(f).size });
          return fs.createReadStream(f).pipe(res);
        }
        if ((act === 'done' || act === 'reject') && m === 'POST') {
          finish(id, act === 'done' ? 'printed' : 'rejected');
          return json(res, 200, { ok: true });
        }
      }
      return json(res, 404, { error: 'Nahi mila' });
    }

    if (m === 'GET' || m === 'HEAD') return serveStatic(req, res, p);
    json(res, 405, { error: 'Not allowed' });
  } catch (e) {
    console.error('request error:', e && e.message);
    if (!res.headersSent) json(res, 500, { error: 'Server error' });
  }
});

// cleanup: pending > 24h, finished > 1h
setInterval(() => {
  const now = Date.now();
  for (const [id, o] of orders) {
    const old = o.status === 'pending' ? now - o.created > 24 * 3600e3 : now - o.finished > 3600e3;
    if (old) { fs.unlink(path.join(FILES, id + '.pdf'), () => {}); orders.delete(id); }
  }
  for (const [k, v] of uploadHits) if (!v.some((t) => now - t < 3600e3)) uploadHits.delete(k);
}, 10 * 60e3).unref();

server.requestTimeout = 5 * 60e3;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`${SHOP_NAME} chal raha hai: port ${PORT}`);
  if (!OWNER_PIN) console.log('WARNING: OWNER_PIN set nahi hai - owner login band rahega.');
});
