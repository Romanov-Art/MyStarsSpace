/**
 * Generation counter — billing + affiliate attribution source of truth.
 * Ported from server/index.mjs (Node + libSQL) to a Worker + D1; behaviour is
 * unchanged:
 *
 * POST /api/track   {event: "view"|"export"|"click", partner?, ref?} → 204
 * POST /api/credits {partner, amount, note?}       (Bearer ADMIN_TOKEN) — prepaid top-up
 * GET  /api/status?partner=id                       (public) → {blocked}
 * GET  /api/report?month=YYYY-MM            (Bearer ADMIN_TOKEN) — partner billing
 * GET  /api/affiliate-report?month=YYYY-MM  (Bearer ADMIN_TOKEN) — affiliate stats
 * GET  /api/health
 *
 * Prepaid model: partners buy generation credits (append-only `credits`
 * journal, admin-only). remaining = SUM(credits) − counted exports since the
 * first top-up. No credits at all → blocked.
 *
 * Anti-fraud layers (billing/commission count only `counted` events):
 *  - strict schema, id format, optional PARTNERS / AFFILIATES allowlists
 *  - Origin/Referer check when ALLOWED_ORIGINS is set
 *  - per-IP rate limit (Workers Rate Limiting binding, 30/min per location)
 *  - daily per-IP caps per (partner, ref): beyond CAP the event is stored as
 *    `flagged`, never billed (export ≤ 10/day, view/click ≤ 50/day)
 *  - IPs are stored only as HMAC-SHA256 hashes (IP_HASH_SECRET)
 */
import { BodyTooLarge, bearerMatches, json, list, readLimited } from '../../shared/http.js';

export interface TrackEnv {
  DB: D1Database;
  TRACK_LIMITER: RateLimit;
  ADMIN_TOKEN?: string;
  IP_HASH_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  PARTNERS?: string;
  AFFILIATES?: string;
}

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const EVENTS: Record<string, number> = { export: 10, view: 50, click: 50 }; // counted cap per (partner,ref)/IP/day
const MAX_BODY = 512;
const MAX_CREDIT_AMOUNT = 1_000_000;

/** CF sets this from the TCP connection; clients cannot spoof it at the edge. */
function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}

async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function adminAuthorized(request: Request, env: TrackEnv): boolean {
  return !!env.ADMIN_TOKEN && bearerMatches(request, [env.ADMIN_TOKEN]);
}

function originAllowed(request: Request, env: TrackEnv): boolean {
  const allowed = list(env.ALLOWED_ORIGINS);
  if (allowed.length === 0) return true;
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  return allowed.some((o) => origin === o || origin.startsWith(o + '/'));
}

async function readJson(request: Request): Promise<{ data?: Record<string, unknown>; status?: number }> {
  try {
    const parsed: unknown = JSON.parse(await readLimited(request, MAX_BODY));
    return { data: (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown> };
  } catch (err) {
    return { status: err instanceof BodyTooLarge ? 413 : 400 };
  }
}

async function handleTrack(request: Request, env: TrackEnv): Promise<Response> {
  const ip = clientIp(request);
  const { success } = await env.TRACK_LIMITER.limit({ key: ip });
  if (!success) return json(429);
  if (!originAllowed(request, env)) return json(403);

  const { data, status } = await readJson(request);
  if (!data) return json(status!);

  const event = data.event;
  if (typeof event !== 'string' || !(event in EVENTS)) return json(400);

  // partner (whitelabel) and ref (affiliate) are both optional; validate each
  const partner = data.partner ?? '';
  const ref = data.ref ?? '';
  if (typeof partner !== 'string' || (partner && !ID_RE.test(partner))) return json(400);
  if (typeof ref !== 'string' || (ref && !ID_RE.test(ref))) return json(400);
  if (!partner && !ref) return json(400); // need at least one billing context
  const partners = list(env.PARTNERS);
  const affiliates = list(env.AFFILIATES);
  if (partner && partners.length > 0 && !partners.includes(partner)) return json(403);
  if (ref && affiliates.length > 0 && !affiliates.includes(ref)) return json(403);

  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET || 'dev-secret-change-me');

  // Cap per (partner, ref) identity: an affiliate/partner can't inflate their
  // own counted total beyond CAP per day from a single IP
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM events
     WHERE partner = ? AND ref = ? AND event = ? AND ip_hash = ? AND day = ? AND status = 'counted'`,
  )
    .bind(partner, ref, event, ipHash, day)
    .first<{ n: number }>();
  const counted = Number(row?.n ?? 0) >= EVENTS[event] ? 'flagged' : 'counted';

  await env.DB.prepare(
    `INSERT INTO events (partner, ref, event, ip_hash, day, status) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(partner, ref, event, ipHash, day, counted)
    .run();
  return json(204);
}

/**
 * remaining = SUM(credits) − counted exports since the FIRST top-up; null when
 * the partner has no credits journal at all (strict prepaid → blocked).
 * Exports before the partner ever prepaid don't consume new credits.
 */
async function remainingFor(env: TrackEnv, partner: string): Promise<number | null> {
  const [credits, exports] = await env.DB.batch<{ total: number | null; n: number }>([
    env.DB.prepare(`SELECT SUM(amount) AS total, COUNT(*) AS n FROM credits WHERE partner = ?`).bind(partner),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM events
       WHERE partner = ? AND event = 'export' AND status = 'counted'
         AND created_at >= (SELECT MIN(created_at) FROM credits WHERE partner = ?)`,
    ).bind(partner, partner),
  ]);
  const cr = credits.results[0];
  if (!cr || Number(cr.n) === 0) return null; // never topped up
  return Number(cr.total) - Number(exports.results[0]?.n ?? 0);
}

async function handleCredits(request: Request, env: TrackEnv): Promise<Response> {
  if (!adminAuthorized(request, env)) return json(401, { error: 'unauthorized' });

  const { data, status } = await readJson(request);
  if (!data) return json(status!, { error: 'bad json' });

  const { partner, amount } = data;
  const note = typeof data.note === 'string' ? data.note.slice(0, 200) : '';
  if (typeof partner !== 'string' || !ID_RE.test(partner)) return json(400, { error: 'bad partner' });
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount as number) > MAX_CREDIT_AMOUNT) {
    return json(400, { error: 'amount must be a non-zero integer within ±1000000' });
  }

  await env.DB.prepare(`INSERT INTO credits (partner, amount, note) VALUES (?, ?, ?)`)
    .bind(partner, amount, note)
    .run();
  const body: Record<string, unknown> = { partner, remaining: await remainingFor(env, partner) };
  // Guard against admin typos: crediting an id outside the allowlist means the
  // real partner stays blocked while the credits land on a ghost
  const partners = list(env.PARTNERS);
  if (partners.length > 0 && !partners.includes(partner)) {
    body.warning = `partner "${partner}" is not in the PARTNERS allowlist — its events are rejected`;
  }
  return json(200, body);
}

async function handleStatus(url: URL, env: TrackEnv): Promise<Response> {
  const partner = url.searchParams.get('partner');
  if (typeof partner !== 'string' || !ID_RE.test(partner)) return json(400, { error: 'bad partner' });
  const remaining = await remainingFor(env, partner);
  // Public response deliberately exposes only the flag, not the count
  return json(
    200,
    { blocked: remaining === null || remaining <= 0 },
    { 'Cache-Control': 'public, max-age=60' },
  );
}

function monthParam(url: URL): string | null {
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

async function handleReport(request: Request, url: URL, env: TrackEnv): Promise<Response> {
  if (!adminAuthorized(request, env)) return json(401, { error: 'unauthorized' });
  const month = monthParam(url);
  if (!month) return json(400, { error: 'month must be YYYY-MM' });

  const [monthly, credits, alltime] = await env.DB.batch<Record<string, string | number>>([
    env.DB.prepare(
      `SELECT partner,
              SUM(CASE WHEN event = 'export' AND status = 'counted' THEN 1 ELSE 0 END) AS exports,
              SUM(CASE WHEN event = 'view'   AND status = 'counted' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged
       FROM events WHERE day LIKE ? AND partner != '' GROUP BY partner ORDER BY exports DESC`,
    ).bind(`${month}-%`),
    env.DB.prepare(`SELECT partner, SUM(amount) AS total FROM credits GROUP BY partner`),
    // Same prepaid-clock rule as remainingFor: only exports since the first top-up
    env.DB.prepare(
      `SELECT e.partner, COUNT(*) AS n FROM events e
       WHERE e.partner != '' AND e.event = 'export' AND e.status = 'counted'
         AND e.created_at >= (SELECT MIN(c.created_at) FROM credits c WHERE c.partner = e.partner)
       GROUP BY e.partner`,
    ),
  ]);

  const creditTotals = new Map(credits.results.map((r) => [String(r.partner), Number(r.total)]));
  const alltimeExports = new Map(alltime.results.map((r) => [String(r.partner), Number(r.n)]));
  // remaining is all-time; partners with credits but no activity this month still appear
  type Row = { partner: string; exports: number; views: number; flagged: number; remaining?: number | null };
  const partners = new Map<string, Row>();
  for (const r of monthly.results) {
    partners.set(String(r.partner), {
      partner: String(r.partner),
      exports: Number(r.exports),
      views: Number(r.views),
      flagged: Number(r.flagged),
    });
  }
  for (const partner of creditTotals.keys()) {
    if (!partners.has(partner)) partners.set(partner, { partner, exports: 0, views: 0, flagged: 0 });
  }
  for (const p of partners.values()) {
    p.remaining = creditTotals.has(p.partner)
      ? creditTotals.get(p.partner)! - (alltimeExports.get(p.partner) || 0)
      : null; // never topped up → blocked
  }
  return json(200, { month, partners: [...partners.values()] });
}

async function handleAffiliateReport(request: Request, url: URL, env: TrackEnv): Promise<Response> {
  if (!adminAuthorized(request, env)) return json(401, { error: 'unauthorized' });
  const month = monthParam(url);
  if (!month) return json(400, { error: 'month must be YYYY-MM' });

  // Per affiliate: clicks (referrals) and conversions (billable generations).
  const { results } = await env.DB.prepare(
    `SELECT ref,
            SUM(CASE WHEN event = 'click'  AND status = 'counted' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN event = 'export' AND status = 'counted' THEN 1 ELSE 0 END) AS conversions,
            SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged
     FROM events WHERE day LIKE ? AND ref != '' GROUP BY ref ORDER BY conversions DESC`,
  )
    .bind(`${month}-%`)
    .all<Record<string, string | number>>();
  return json(200, {
    month,
    affiliates: results.map((r) => ({
      ref: String(r.ref),
      clicks: Number(r.clicks),
      conversions: Number(r.conversions),
      flagged: Number(r.flagged),
    })),
  });
}

export async function handleApi(request: Request, env: TrackEnv): Promise<Response> {
  const url = new URL(request.url);
  try {
    const { method } = request;
    const path = url.pathname;
    if (method === 'POST' && path === '/api/track') return await handleTrack(request, env);
    if (method === 'POST' && path === '/api/credits') return await handleCredits(request, env);
    if (method === 'GET' && path === '/api/status') return await handleStatus(url, env);
    if (method === 'GET' && path === '/api/report') return await handleReport(request, url, env);
    if (method === 'GET' && path === '/api/affiliate-report') return await handleAffiliateReport(request, url, env);
    if (method === 'GET' && path === '/api/health') return json(200, { ok: true });
    return json(404);
  } catch (err) {
    console.error(err);
    return json(500);
  }
}
