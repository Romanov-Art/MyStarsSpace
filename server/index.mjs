/**
 * Generation counter — billing + affiliate attribution source of truth.
 *
 * POST /api/track   {event: "view"|"export"|"click", partner?, ref?} → 204
 * GET  /api/report?month=YYYY-MM            (Bearer ADMIN_TOKEN) — partner billing
 * GET  /api/affiliate-report?month=YYYY-MM  (Bearer ADMIN_TOKEN) — affiliate stats
 * GET  /api/health
 *
 * `partner` = whitelabel embed (billed per export). `ref` = affiliate that
 * referred the visitor to our own site. A payload may carry either or both.
 *
 * Anti-fraud layers (billing/commission count only `counted` events):
 *  - strict schema, id format, optional PARTNERS / AFFILIATES allowlists
 *  - Origin/Referer check when ALLOWED_ORIGINS is set
 *  - in-memory per-IP rate limit (RATE_LIMIT_PER_MIN, default 30)
 *  - daily per-IP caps per (partner, ref): beyond CAP the event is stored as
 *    `flagged`, never billed (export ≤ 10/day, view/click ≤ 50/day)
 *  - IPs are stored only as HMAC-SHA256 hashes (IP_HASH_SECRET)
 *
 * Env:
 *  PORT=8787  LIBSQL_URL=file:/data/track.db  LIBSQL_AUTH_TOKEN=
 *  ADMIN_TOKEN (required for reports)
 *  IP_HASH_SECRET (set a stable random string in production)
 *  ALLOWED_ORIGINS=https://example.com,https://www.example.com
 *  PARTNERS=demo,acme        (optional strict whitelabel allowlist)
 *  AFFILIATES=blogger,promo1 (optional strict affiliate allowlist)
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
const AFFILIATES = (process.env.AFFILIATES || '').split(',').map(s => s.trim()).filter(Boolean);
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 30);

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const EVENTS = { export: 10, view: 50, click: 50 }; // event → counted cap per (partner,ref)/IP/day
const MAX_BODY = 512;

const db = createClient({
  url: LIBSQL_URL,
  ...(process.env.LIBSQL_AUTH_TOKEN ? { authToken: process.env.LIBSQL_AUTH_TOKEN } : {}),
});

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner TEXT NOT NULL DEFAULT '',
    ref TEXT NOT NULL DEFAULT '',
    event TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    day TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  // Migration: add `ref` to pre-affiliate databases
  const cols = await db.execute(`PRAGMA table_info(events)`);
  if (!cols.rows.some(r => r.name === 'ref')) {
    await db.execute(`ALTER TABLE events ADD COLUMN ref TEXT NOT NULL DEFAULT ''`);
  }
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_events_partner_day ON events(partner, day)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_events_ref_day ON events(ref, day)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_events_dedupe ON events(partner, ref, event, ip_hash, day, status)`);
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

  const { event } = data || {};
  if (typeof event !== 'string' || !(event in EVENTS)) return send(res, 400);

  // partner (whitelabel) and ref (affiliate) are both optional; validate each
  const partner = data.partner ?? '';
  const ref = data.ref ?? '';
  if (typeof partner !== 'string' || (partner && !ID_RE.test(partner))) return send(res, 400);
  if (typeof ref !== 'string' || (ref && !ID_RE.test(ref))) return send(res, 400);
  if (!partner && !ref) return send(res, 400); // need at least one billing context
  if (partner && PARTNERS.length > 0 && !PARTNERS.includes(partner)) return send(res, 403);
  if (ref && AFFILIATES.length > 0 && !AFFILIATES.includes(ref)) return send(res, 403);

  const day = new Date().toISOString().slice(0, 10);
  const ipHash = hashIp(ip);
  const cap = EVENTS[event];

  // Cap per (partner, ref) identity: an affiliate/partner can't inflate their
  // own counted total beyond CAP per day from a single IP
  const { rows } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM events
          WHERE partner = ? AND ref = ? AND event = ? AND ip_hash = ? AND day = ? AND status = 'counted'`,
    args: [partner, ref, event, ipHash, day],
  });
  const status = Number(rows[0].n) >= cap ? 'flagged' : 'counted';

  await db.execute({
    sql: `INSERT INTO events (partner, ref, event, ip_hash, day, status) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [partner, ref, event, ipHash, day, status],
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
          FROM events WHERE day LIKE ? AND partner != '' GROUP BY partner ORDER BY exports DESC`,
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

async function handleAffiliateReport(req, res, url) {
  const auth = req.headers.authorization || '';
  if (!ADMIN_TOKEN || auth !== `Bearer ${ADMIN_TOKEN}`) return send(res, 401, { error: 'unauthorized' });

  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'month must be YYYY-MM' });

  // Per affiliate: clicks (referrals) and conversions (billable generations).
  // Commission = your rate × conversions, computed by the billing layer.
  const { rows } = await db.execute({
    sql: `SELECT ref,
                 SUM(CASE WHEN event = 'click'  AND status = 'counted' THEN 1 ELSE 0 END) AS clicks,
                 SUM(CASE WHEN event = 'export' AND status = 'counted' THEN 1 ELSE 0 END) AS conversions,
                 SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged
          FROM events WHERE day LIKE ? AND ref != '' GROUP BY ref ORDER BY conversions DESC`,
    args: [`${month}-%`],
  });
  return send(res, 200, {
    month,
    affiliates: rows.map(r => ({
      ref: r.ref,
      clicks: Number(r.clicks),
      conversions: Number(r.conversions),
      flagged: Number(r.flagged),
    })),
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/api/track') return await handleTrack(req, res);
    if (req.method === 'GET' && url.pathname === '/api/report') return await handleReport(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/affiliate-report') return await handleAffiliateReport(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
    return send(res, 404);
  } catch (err) {
    console.error(err);
    return send(res, 500);
  }
});

await initDb();
server.listen(PORT, () => console.log(`track service on :${PORT} (db: ${LIBSQL_URL})`));
