/**
 * "Edit in Canva" — Canva Connect on the mystars.space edge.
 *
 * The browser renders the customer's poster into a PDF whose texts are real,
 * embedded-font text, and Canva's Design Import turns it into an ordinary
 * editable design in the customer's own Canva account. Design Import has no
 * plan restriction (unlike Autofill, which needs Canva Enterprise).
 *
 * Flow — everything Canva-related happens in a top-level popup on
 * mystars.space, so first-party cookies work even when the editor itself is
 * embedded in a partner's iframe (where third-party cookies are blocked):
 *
 *   1. app   POST /api/canva/upload (PDF)        → {upload_id}   (KV, 1h TTL)
 *   2. popup GET  /api/canva/open?upload=ID
 *        no Canva session → OAuth (PKCE, state bound to a cookie) → Canva
 *   3. Canva → GET /api/canva/callback → session cookie → back to /open
 *   4. popup page POST /api/canva/import {upload} → Canva import job → edit_url
 *
 * Canva tokens are AES-GCM encrypted (CANVA_TOKEN_KEY) and keyed by the hash
 * of the session cookie, so a database dump yields neither.
 */
import { base64url, json, list, parseCookies, randomHex, sha256Hex } from '../../shared/http.js';
import { openingPage, messagePage } from './canva-pages.js';

export interface CanvaEnv {
  DB: D1Database;
  CANVA_UPLOADS: KVNamespace;
  CANVA_LIMITER: RateLimit;
  ALLOWED_ORIGINS?: string;
  CANVA_CLIENT_ID?: string;
  CANVA_CLIENT_SECRET?: string;
  /** base64 of 32 random bytes */
  CANVA_TOKEN_KEY?: string;
}

export interface CanvaDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number; // unix seconds
}

export const defaultDeps: CanvaDeps = {
  fetch: (input, init) => fetch(input, init),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Math.floor(Date.now() / 1000),
};

const AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
const API = 'https://api.canva.com/rest/v1';
// Design Import needs only this scope; fewer scopes also ease Canva's review
const SCOPES = 'design:content:write';

const SESSION_COOKIE = 'ms_canva';
const STATE_COOKIE = 'ms_canva_oauth';
const STATE_TTL = 600;
const UPLOAD_TTL = 3600;
const MAX_PDF = 24 * 1024 * 1024; // KV values are capped at 25 MiB
const UPLOAD_ID_RE = /^[0-9a-f]{32}$/;
const POLL_DEADLINE_MS = 110_000;

export function canvaConfigured(env: CanvaEnv): boolean {
  return !!(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET && env.CANVA_TOKEN_KEY);
}

// ── crypto ──────────────────────────────────────────────────────────

async function tokenKey(env: CanvaEnv): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(env.CANVA_TOKEN_KEY!), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

interface Tokens {
  access_token: string;
  refresh_token: string;
}

async function seal(env: CanvaEnv, tokens: Tokens): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(tokens));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await tokenKey(env), data));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}

async function unseal(env: CanvaEnv, sealed: string): Promise<Tokens> {
  const bytes = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    await tokenKey(env),
    bytes.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Tokens;
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

// ── helpers ─────────────────────────────────────────────────────────

function cookie(name: string, value: string, path: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

function sameOrigin(request: Request, env: CanvaEnv): boolean {
  const origin = request.headers.get('Origin') ?? '';
  return origin === new URL(request.url).origin || list(env.ALLOWED_ORIGINS).includes(origin);
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}

function prefersRussian(request: Request): boolean {
  return /^ru\b/i.test(request.headers.get('Accept-Language') ?? '');
}

class CanvaError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function canvaErrorResponse(err: CanvaError): Response {
  return json(err.status, { error: { code: err.code, message: err.message } });
}

async function tokenRequest(env: CanvaEnv, deps: CanvaDeps, form: Record<string, string>) {
  const res = await deps.fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.CANVA_CLIENT_ID}:${env.CANVA_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form),
  });
  if (!res.ok) {
    // 400/401 from the token endpoint means the grant is dead (revoked, reused, expired)
    throw new CanvaError(res.status >= 500 ? 502 : 401, res.status >= 500 ? 'canva_error' : 'reconnect', `Canva token endpoint returned ${res.status}`);
  }
  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
}

// ── sessions ────────────────────────────────────────────────────────

async function storeSession(env: CanvaEnv, deps: CanvaDeps, sidHash: string, t: { access_token: string; refresh_token: string; expires_in: number }) {
  const sealed = await seal(env, { access_token: t.access_token, refresh_token: t.refresh_token });
  await env.DB.prepare(
    `INSERT INTO canva_sessions (sid_hash, tokens, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(sid_hash) DO UPDATE SET tokens = excluded.tokens, expires_at = excluded.expires_at, updated_at = datetime('now')`,
  )
    .bind(sidHash, sealed, deps.now() + t.expires_in)
    .run();
}

async function sessionHash(request: Request): Promise<string | null> {
  const sid = parseCookies(request)[SESSION_COOKIE];
  return sid && /^[0-9a-f]{64}$/.test(sid) ? sha256Hex(sid) : null;
}

/** A usable access token for this browser's session, refreshing it if it's about to expire. */
async function accessToken(env: CanvaEnv, deps: CanvaDeps, sidHash: string): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT tokens, expires_at FROM canva_sessions WHERE sid_hash = ?`)
    .bind(sidHash)
    .first<{ tokens: string; expires_at: number }>();
  if (!row) return null;
  let tokens: Tokens;
  try {
    tokens = await unseal(env, row.tokens);
  } catch {
    // Sealed with a previous CANVA_TOKEN_KEY: treat as signed out, reconnect via OAuth
    await env.DB.prepare(`DELETE FROM canva_sessions WHERE sid_hash = ?`).bind(sidHash).run();
    return null;
  }
  if (row.expires_at - deps.now() > 60) return tokens.access_token;
  try {
    const fresh = await tokenRequest(env, deps, { grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
    // Canva rotates refresh tokens; keep the old one only if none came back
    await storeSession(env, deps, sidHash, { ...fresh, refresh_token: fresh.refresh_token || tokens.refresh_token });
    return fresh.access_token;
  } catch (err) {
    if (err instanceof CanvaError && err.code === 'reconnect') {
      await env.DB.prepare(`DELETE FROM canva_sessions WHERE sid_hash = ?`).bind(sidHash).run();
      return null;
    }
    throw err;
  }
}

// ── endpoints ───────────────────────────────────────────────────────

/**
 * Streams the body into KV, refusing non-PDFs and anything over MAX_PDF
 * without buffering it. The reason is kept in `rejection`: an error thrown
 * inside the stream reaches the KV put() as a plain Error, not a CanvaError.
 */
function pdfGuard() {
  const result: { rejection?: CanvaError } = {};
  let seen = 0;
  let head = new Uint8Array(0);
  let checked = false;
  const reject = (controller: TransformStreamDefaultController<Uint8Array>, err: CanvaError) => {
    result.rejection = err;
    controller.error(err);
  };
  const stream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      seen += chunk.byteLength;
      if (seen > MAX_PDF) return reject(controller, new CanvaError(413, 'too_large', 'PDF is too large'));
      if (!checked) {
        const merged = new Uint8Array(head.length + chunk.length);
        merged.set(head);
        merged.set(chunk, head.length);
        head = merged.slice(0, 5);
        if (head.length >= 5) {
          if (new TextDecoder().decode(head) !== '%PDF-') return reject(controller, new CanvaError(400, 'not_pdf', 'Body is not a PDF'));
          checked = true;
        }
      }
      controller.enqueue(chunk);
    },
    flush(controller) {
      if (!checked) reject(controller, new CanvaError(400, 'not_pdf', 'Body is not a PDF'));
    },
  });
  return { stream, result };
}

async function handleUpload(request: Request, env: CanvaEnv): Promise<Response> {
  if (!sameOrigin(request, env)) return json(403, { error: { code: 'forbidden', message: 'Cross-origin upload' } });
  const { success } = await env.CANVA_LIMITER.limit({ key: `upload:${clientIp(request)}` });
  if (!success) return json(429, { error: { code: 'rate_limited', message: 'Too many requests' } });
  if (!(request.headers.get('Content-Type') ?? '').startsWith('application/pdf')) {
    return json(415, { error: { code: 'not_pdf', message: 'Content-Type must be application/pdf' } });
  }
  const size = Number(request.headers.get('Content-Length') ?? 'NaN');
  if (!Number.isFinite(size)) return json(411, { error: { code: 'length_required', message: 'Content-Length required' } });
  if (size > MAX_PDF) return json(413, { error: { code: 'too_large', message: 'PDF is too large' } });
  if (!request.body) return json(400, { error: { code: 'not_pdf', message: 'Empty body' } });

  // Title shown in the customer's Canva; Canva caps it at 50 characters
  let title = 'My Star Map';
  try {
    title = decodeURIComponent(request.headers.get('X-Design-Title') ?? '').trim().slice(0, 50) || title;
  } catch {
    /* keep default */
  }

  const id = randomHex(16);
  const guard = pdfGuard();
  request.body.pipeTo(guard.stream.writable).catch(() => {}); // failures surface via put()
  try {
    // KV metadata travels as a header, so keep it ASCII: the title is URI-encoded
    await env.CANVA_UPLOADS.put(id, guard.stream.readable, {
      expirationTtl: UPLOAD_TTL,
      metadata: { size, title: encodeURIComponent(title) },
    });
  } catch (err) {
    if (guard.result.rejection) return canvaErrorResponse(guard.result.rejection);
    throw err;
  }
  return json(200, { upload_id: id });
}

async function handleOpen(request: Request, env: CanvaEnv, deps: CanvaDeps): Promise<Response> {
  const ru = prefersRussian(request);
  const upload = new URL(request.url).searchParams.get('upload') ?? '';
  if (!UPLOAD_ID_RE.test(upload)) return messagePage(400, ru, 'expired');
  const sidHash = await sessionHash(request);
  if (sidHash && (await accessToken(env, deps, sidHash))) return openingPage(ru, upload);

  // Start OAuth. The state is bound to this browser by a cookie so an attacker
  // can't complete a flow they started (login CSRF), and it remembers the upload.
  const state = randomHex(32);
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const now = deps.now();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM canva_oauth_states WHERE created_at < ?`).bind(now - STATE_TTL),
    env.DB.prepare(`INSERT INTO canva_oauth_states (state_hash, verifier, upload_id, created_at) VALUES (?, ?, ?, ?)`).bind(
      await sha256Hex(state),
      verifier,
      upload,
      now,
    ),
  ]);
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 's256',
    scope: SCOPES,
    response_type: 'code',
    client_id: env.CANVA_CLIENT_ID!,
    state,
    redirect_uri: `${new URL(request.url).origin}/api/canva/callback`,
  }).toString();
  return redirect(url.toString(), [cookie(STATE_COOKIE, state, '/api/canva/callback', STATE_TTL)]);
}

async function handleCallback(request: Request, env: CanvaEnv, deps: CanvaDeps): Promise<Response> {
  const ru = prefersRussian(request);
  const params = new URL(request.url).searchParams;
  const clearState = cookie(STATE_COOKIE, '', '/api/canva/callback', 0);
  if (params.get('error')) return messagePage(200, ru, 'cancelled', [clearState]);

  const state = params.get('state') ?? '';
  const code = params.get('code') ?? '';
  if (!state || !code || parseCookies(request)[STATE_COOKIE] !== state) {
    return messagePage(400, ru, 'expired', [clearState]);
  }
  const row = await env.DB.prepare(
    `DELETE FROM canva_oauth_states WHERE state_hash = ? RETURNING verifier, upload_id, created_at`,
  )
    .bind(await sha256Hex(state))
    .first<{ verifier: string; upload_id: string; created_at: number }>();
  if (!row || deps.now() - row.created_at > STATE_TTL) return messagePage(400, ru, 'expired', [clearState]);

  let tokens;
  try {
    tokens = await tokenRequest(env, deps, {
      grant_type: 'authorization_code',
      code,
      code_verifier: row.verifier,
      redirect_uri: `${new URL(request.url).origin}/api/canva/callback`,
    });
  } catch {
    return messagePage(502, ru, 'failed', [clearState]);
  }
  const sid = randomHex(32);
  await storeSession(env, deps, await sha256Hex(sid), tokens);
  return redirect(`/api/canva/open?upload=${row.upload_id}`, [
    cookie(SESSION_COOKIE, sid, '/api/canva', 365 * 24 * 3600),
    clearState,
  ]);
}

async function handleImport(request: Request, env: CanvaEnv, deps: CanvaDeps): Promise<Response> {
  if (!sameOrigin(request, env)) return json(403, { error: { code: 'forbidden', message: 'Cross-origin request' } });
  const sidHash = await sessionHash(request);
  if (!sidHash) return json(401, { error: { code: 'reconnect', message: 'Connect your Canva account' } });
  const { success } = await env.CANVA_LIMITER.limit({ key: `import:${sidHash}` });
  if (!success) return json(429, { error: { code: 'rate_limited', message: 'Too many requests' } });

  let upload = '';
  try {
    upload = String(((await request.json()) as { upload?: unknown }).upload ?? '');
  } catch {
    /* validated below */
  }
  if (!UPLOAD_ID_RE.test(upload)) return json(400, { error: { code: 'bad_upload', message: 'Unknown upload' } });

  try {
    const token = await accessToken(env, deps, sidHash);
    if (!token) return json(401, { error: { code: 'reconnect', message: 'Connect your Canva account' } });

    const stored = await env.CANVA_UPLOADS.getWithMetadata<{ size: number; title: string }>(upload, 'stream');
    if (!stored.value || !stored.metadata) {
      return json(410, { error: { code: 'expired', message: 'The prepared design expired, please try again' } });
    }

    // Canva needs a Content-Length; a FixedLengthStream streams the PDF from KV with one
    const body = new FixedLengthStream(stored.metadata.size);
    stored.value.pipeTo(body.writable).catch(() => {});
    const created = await deps.fetch(`${API}/imports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Import-Metadata': JSON.stringify({
          title_base64: btoa(String.fromCharCode(...new TextEncoder().encode(decodeURIComponent(stored.metadata.title)))),
          mime_type: 'application/pdf',
        }),
      },
      body: body.readable,
    });
    if (created.status === 401) throw new CanvaError(401, 'reconnect', 'Canva rejected the access token');
    if (created.status === 429) throw new CanvaError(429, 'rate_limited', 'Canva rate limit reached, try again in a minute');
    if (!created.ok) throw new CanvaError(502, 'canva_error', `Canva import returned ${created.status}`);
    const jobId = ((await created.json()) as { job: { id: string } }).job.id;

    const started = Date.now();
    for (let attempt = 0; Date.now() - started < POLL_DEADLINE_MS; attempt++) {
      await deps.sleep(attempt < 5 ? 1000 : 2000);
      const res = await deps.fetch(`${API}/imports/${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new CanvaError(502, 'canva_error', `Canva import status returned ${res.status}`);
      const { job } = (await res.json()) as {
        job: {
          status: string;
          result?: { designs?: { id: string; urls?: { edit_url?: string; view_url?: string } }[] };
          error?: { code?: string; message?: string };
        };
      };
      if (job.status === 'failed') throw new CanvaError(502, job.error?.code ?? 'import_failed', job.error?.message ?? 'Canva could not import the design');
      if (job.status === 'success') {
        const design = job.result?.designs?.[0];
        if (!design?.urls?.edit_url) throw new CanvaError(502, 'canva_error', 'Canva returned no edit link');
        return json(200, { design_id: design.id, edit_url: design.urls.edit_url, view_url: design.urls.view_url });
      }
    }
    throw new CanvaError(504, 'timeout', 'Canva is taking too long, please try again');
  } catch (err) {
    if (err instanceof CanvaError) {
      if (err.code === 'reconnect') await env.DB.prepare(`DELETE FROM canva_sessions WHERE sid_hash = ?`).bind(sidHash).run();
      return canvaErrorResponse(err);
    }
    throw err;
  }
}

async function handleDisconnect(request: Request, env: CanvaEnv, deps: CanvaDeps): Promise<Response> {
  if (!sameOrigin(request, env)) return json(403, { error: { code: 'forbidden', message: 'Cross-origin request' } });
  const sidHash = await sessionHash(request);
  if (sidHash) {
    const row = await env.DB.prepare(`DELETE FROM canva_sessions WHERE sid_hash = ? RETURNING tokens`)
      .bind(sidHash)
      .first<{ tokens: string }>();
    if (row) {
      const { refresh_token } = await unseal(env, row.tokens);
      // Best effort: revoking at Canva also removes our access from their account page
      await deps
        .fetch(`${API}/oauth/revoke`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${env.CANVA_CLIENT_ID}:${env.CANVA_CLIENT_SECRET}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: refresh_token, client_id: env.CANVA_CLIENT_ID!, client_secret: env.CANVA_CLIENT_SECRET! }),
        })
        .catch(() => {});
    }
  }
  const headers = new Headers({ 'Set-Cookie': cookie(SESSION_COOKIE, '', '/api/canva', 0) });
  return new Response(null, { status: 204, headers });
}

export async function handleCanvaApi(
  request: Request,
  env: CanvaEnv,
  deps: CanvaDeps = defaultDeps,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const { method } = request;
  if (method === 'GET' && pathname === '/api/canva/status') {
    return json(200, { configured: canvaConfigured(env) }, { 'Cache-Control': 'no-store' });
  }
  if (!canvaConfigured(env)) return json(503, { error: { code: 'not_configured', message: 'Canva is not configured' } });
  if (method === 'POST' && pathname === '/api/canva/upload') return handleUpload(request, env);
  if (method === 'GET' && pathname === '/api/canva/open') return handleOpen(request, env, deps);
  if (method === 'GET' && pathname === '/api/canva/callback') return handleCallback(request, env, deps);
  if (method === 'POST' && pathname === '/api/canva/import') return handleImport(request, env, deps);
  if (method === 'POST' && pathname === '/api/canva/disconnect') return handleDisconnect(request, env, deps);
  return json(404);
}
