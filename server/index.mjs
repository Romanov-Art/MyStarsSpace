/**
 * Partner generation counter — billing source of truth.
 *
 * POST /api/track   {partner, event: "view"|"export"}  → 204 (counted or flagged)
 * GET  /api/report?month=YYYY-MM  (Authorization: Bearer ADMIN_TOKEN)
 * GET  /api/health
 *
 * Anti-fraud layers (billing counts only `counted` events):
 *  - strict schema, id format, optional PARTNERS allowlist
 *  - Origin/Referer check when ALLOWED_ORIGINS is set
 *  - in-memory per-IP rate limit (RATE_LIMIT_PER_MIN, default 30)
 *  - daily per-IP caps per partner: beyond CAP the event is stored as
 *    `flagged`, never billed (export ≤ 10/day, view ≤ 50/day)
 *  - IPs are stored only as HMAC-SHA256 hashes (IP_HASH_SECRET)
 *
 * Env:
 *  PORT=8787  LIBSQL_URL=file:/data/track.db  LIBSQL_AUTH_TOKEN=
 *  ADMIN_TOKEN (required for /api/report)
 *  IP_HASH_SECRET (set a stable random string in production)
 *  ALLOWED_ORIGINS=https://example.com,https://www.example.com
 *  PARTNERS=demo,acme (optional strict allowlist)
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';

const PORT = Number(process.env.PORT || 8787);
const LIBSQL_URL = process.env.LIBSQL_URL || 'file:/data/track.db';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const IP_HASH_SECRET = process.env.IP_HASH_SECRET || 'dev-secret-change-me';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const PARTNERS = (process.env.PARTNERS || '').split(',').map(s => s.trim()).filter(Boolean);
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 30);

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const EVENTS = { export: 10, view: 50 }; // event → counted cap per partner/IP/day
const MAX_BODY = 512;

const db = createClient({
  url: LIBSQL_URL,
  ...(process.env.LIBSQL_AUTH_TOKEN ? { authToken: process.env.LIBSQL_AUTH_TOKEN } : {}),
});

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner TEXT NOT NULL,
    event TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    day TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_events_partner_day ON events(partner, day)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_events_dedupe ON events(partner, event, ip_hash, day, status)`);
}

// --- in-memory per-IP rate limiter (fixed 1-minute windows) ---
const rateBuckets = new Map(); // ip → {windowStart, count}
function rateLimited(ip) {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now - b.windowStart >= 60_000) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT_PER_MIN;
}
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, b] of rateBuckets) if (b.windowStart < cutoff) rateBuckets.delete(ip);
}, 60_000).unref();

function clientIp(req) {
  // nginx sets X-Real-IP; fall back to the socket for direct/dev access
  const real = req.headers['x-real-ip'];
  return (typeof real === 'string' && real) || req.socket.remoteAddress || 'unknown';
}

function hashIp(ip) {
  return crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex').slice(0, 32);
}

function originAllowed(req) {
  if (ALLOWED_ORIGINS.length === 0) return true;
  const origin = req.headers.origin || req.headers.referer || '';
  return ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + '/'));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { tooLarge: true })); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, body) {
  if (body === undefined) { res.writeHead(status); res.end(); return; }
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(json);
}

async function handleTrack(req, res) {
  const ip = clientIp(req);
  if (rateLimited(ip)) return send(res, 429);
  if (!originAllowed(req)) return send(res, 403);

  let data;
  try {
    data = JSON.parse(await readBody(req));
  } catch (err) {
    return send(res, err && err.tooLarge ? 413 : 400);
  }

  const { partner, event } = data || {};
  if (typeof partner !== 'string' || !ID_RE.test(partner)) return send(res, 400);
  if (typeof event !== 'string' || !(event in EVENTS)) return send(res, 400);
  if (PARTNERS.length > 0 && !PARTNERS.includes(partner)) return send(res, 403);

  const day = new Date().toISOString().slice(0, 10);
  const ipHash = hashIp(ip);
  const cap = EVENTS[event];

  const { rows } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM events
          WHERE partner = ? AND event = ? AND ip_hash = ? AND day = ? AND status = 'counted'`,
    args: [partner, event, ipHash, day],
  });
  const status = Number(rows[0].n) >= cap ? 'flagged' : 'counted';

  await db.execute({
    sql: `INSERT INTO events (partner, event, ip_hash, day, status) VALUES (?, ?, ?, ?, ?)`,
    args: [partner, event, ipHash, day, status],
  });
  return send(res, 204);
}

async function handleReport(req, res, url) {
  const auth = req.headers.authorization || '';
  if (!ADMIN_TOKEN || auth !== `Bearer ${ADMIN_TOKEN}`) return send(res, 401, { error: 'unauthorized' });

  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'month must be YYYY-MM' });

  const { rows } = await db.execute({
    sql: `SELECT partner,
                 SUM(CASE WHEN event = 'export' AND status = 'counted' THEN 1 ELSE 0 END) AS exports,
                 SUM(CASE WHEN event = 'view'   AND status = 'counted' THEN 1 ELSE 0 END) AS views,
                 SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged
          FROM events WHERE day LIKE ? GROUP BY partner ORDER BY exports DESC`,
    args: [`${month}-%`],
  });
  return send(res, 200, {
    month,
    partners: rows.map(r => ({
      partner: r.partner,
      exports: Number(r.exports),
      views: Number(r.views),
      flagged: Number(r.flagged),
    })),
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/api/track') return await handleTrack(req, res);
    if (req.method === 'GET' && url.pathname === '/api/report') return await handleReport(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
    return send(res, 404);
  } catch (err) {
    console.error(err);
    return send(res, 500);
  }
});

await initDb();
server.listen(PORT, () => console.log(`track service on :${PORT} (db: ${LIBSQL_URL})`));
