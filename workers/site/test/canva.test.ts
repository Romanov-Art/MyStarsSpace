import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleCanvaApi, type CanvaDeps, type CanvaEnv } from '../src/canva.js';

const ORIGIN = 'https://mystars.space';
const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const PDF = new TextEncoder().encode('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');

function testEnv(overrides: Partial<CanvaEnv> = {}): CanvaEnv {
  return {
    DB: env.DB,
    CANVA_UPLOADS: env.CANVA_UPLOADS,
    CANVA_LIMITER: env.CANVA_LIMITER,
    ALLOWED_ORIGINS: 'https://mystars.space,https://www.mystars.space',
    CANVA_CLIENT_ID: 'OC-test',
    CANVA_CLIENT_SECRET: 'cnvca-secret',
    CANVA_TOKEN_KEY: KEY,
    ...overrides,
  };
}

/** Fake Canva Connect API that records what it receives. */
function fakeCanva(opts: { refresh?: 'ok' | 'dead'; job?: 'success' | 'failed' } = {}) {
  const calls: { method: string; url: string; headers: Headers; body: string; bytes?: Uint8Array }[] = [];
  let clock = 1_000_000;
  let tokenSeq = 0;
  let polls = 0;
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const bytes = new Uint8Array(await req.arrayBuffer());
    const body = new TextDecoder().decode(bytes);
    calls.push({ method: req.method, url: req.url, headers: req.headers, body, bytes });

    if (url.pathname === '/rest/v1/oauth/token') {
      const form = new URLSearchParams(body);
      if (form.get('grant_type') === 'authorization_code' && form.get('code') !== 'good-code') return reply(400, { error: 'invalid_grant' });
      if (form.get('grant_type') === 'refresh_token' && opts.refresh === 'dead') return reply(400, { error: 'invalid_grant' });
      tokenSeq += 1;
      return reply(200, { access_token: `access-${tokenSeq}`, refresh_token: `refresh-${tokenSeq}`, token_type: 'Bearer', expires_in: 14400 });
    }
    if (url.pathname === '/rest/v1/imports' && req.method === 'POST') return reply(200, { job: { id: 'job-1', status: 'in_progress' } });
    if (url.pathname === '/rest/v1/imports/job-1') {
      polls += 1;
      if (polls < 2) return reply(200, { job: { id: 'job-1', status: 'in_progress' } });
      if (opts.job === 'failed') return reply(200, { job: { id: 'job-1', status: 'failed', error: { code: 'invalid_file', message: 'bad pdf' } } });
      return reply(200, {
        job: { id: 'job-1', status: 'success', result: { designs: [{ id: 'DAG123', urls: { edit_url: 'https://www.canva.com/design/DAG123/edit', view_url: 'https://www.canva.com/design/DAG123/view' } }] } },
      });
    }
    if (url.pathname === '/rest/v1/oauth/revoke') return reply(200, {});
    return reply(404, {});
  }) as typeof fetch;

  const deps: CanvaDeps = { fetch: fetchImpl, sleep: async () => {}, now: () => clock };
  return { calls, deps, advance: (s: number) => (clock += s) };
}

const call = (deps: CanvaDeps, path: string, init: RequestInit = {}, e: CanvaEnv = testEnv()) =>
  handleCanvaApi(new Request(`${ORIGIN}${path}`, init), e, deps);

async function upload(deps: CanvaDeps, title = 'Our Night Sky ✨') {
  const r = await call(deps, '/api/canva/upload', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/pdf', 'Content-Length': String(PDF.length), 'X-Design-Title': encodeURIComponent(title) },
    body: PDF,
  });
  expect(r.status).toBe(200);
  return ((await r.json()) as { upload_id: string }).upload_id;
}

function setCookie(r: Response, name: string): string | null {
  for (const c of r.headers.getAll?.('Set-Cookie') ?? r.headers.get('Set-Cookie')?.split(/,(?=\s*\w+=)/) ?? []) {
    const m = c.match(new RegExp(`(?:^|\\s)${name}=([^;]*)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

/** Runs the whole OAuth dance for an upload and returns the session cookie. */
async function connect(fake: ReturnType<typeof fakeCanva>, uploadId: string) {
  const open = await call(fake.deps, `/api/canva/open?upload=${uploadId}`);
  const state = new URL(open.headers.get('Location')!).searchParams.get('state')!;
  const cb = await call(fake.deps, `/api/canva/callback?code=good-code&state=${state}`, {
    headers: { Cookie: `ms_canva_oauth=${state}` },
  });
  return { open, cb, sid: setCookie(cb, 'ms_canva')! };
}

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare('DELETE FROM canva_sessions'), env.DB.prepare('DELETE FROM canva_oauth_states')]);
});

describe('Edit in Canva: configuration', () => {
  it('reports unconfigured and refuses work until all three secrets exist', async () => {
    const { deps } = fakeCanva();
    const bare = testEnv({ CANVA_CLIENT_SECRET: undefined });
    expect(await (await call(deps, '/api/canva/status', {}, bare)).json()).toEqual({ configured: false });
    expect((await call(deps, '/api/canva/open?upload=' + 'a'.repeat(32), {}, bare)).status).toBe(503);
    expect(await (await call(deps, '/api/canva/status')).json()).toEqual({ configured: true });
  });
});

describe('Edit in Canva: upload', () => {
  it('stores the PDF with its title for an hour', async () => {
    const { deps } = fakeCanva();
    const id = await upload(deps);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    const stored = await env.CANVA_UPLOADS.getWithMetadata<{ size: number; title: string }>(id, 'arrayBuffer');
    expect(new Uint8Array(stored.value!)).toEqual(PDF);
    expect(stored.metadata!.size).toBe(PDF.length);
    expect(decodeURIComponent(stored.metadata!.title)).toBe('Our Night Sky ✨');
  });

  it('rejects cross-origin, non-PDF and oversized uploads', async () => {
    const { deps } = fakeCanva();
    const base = { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/pdf', 'Content-Length': String(PDF.length) }, body: PDF };
    expect((await call(deps, '/api/canva/upload', { ...base, headers: { ...base.headers, Origin: 'https://evil.example' } })).status).toBe(403);
    expect((await call(deps, '/api/canva/upload', { ...base, headers: { ...base.headers, 'Content-Type': 'image/png' } })).status).toBe(415);
    const notPdf = new TextEncoder().encode('<html>not a pdf</html>');
    const r = await call(deps, '/api/canva/upload', { ...base, headers: { ...base.headers, 'Content-Length': String(notPdf.length) }, body: notPdf });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe('not_pdf');
    expect((await call(deps, '/api/canva/upload', { ...base, headers: { ...base.headers, 'Content-Length': String(30 * 1024 * 1024) } })).status).toBe(413);
  });
});

describe('Edit in Canva: OAuth', () => {
  it('sends a browser without a session to Canva with PKCE and a cookie-bound state', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const r = await call(fake.deps, `/api/canva/open?upload=${id}`);
    expect(r.status).toBe(302);
    const url = new URL(r.headers.get('Location')!);
    expect(url.origin + url.pathname).toBe('https://www.canva.com/api/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'OC-test',
      response_type: 'code',
      code_challenge_method: 's256',
      scope: 'design:content:write',
      redirect_uri: 'https://mystars.space/api/canva/callback',
    });
    const state = url.searchParams.get('state')!;
    expect(setCookie(r, 'ms_canva_oauth')).toBe(state);
    // Only the hash of the state is stored
    const rows = await env.DB.prepare('SELECT state_hash FROM canva_oauth_states').all<{ state_hash: string }>();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0].state_hash).not.toBe(state);
  });

  it('exchanges the code with a verifier matching the challenge, then returns to the design', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const { open, cb, sid } = await connect(fake, id);
    expect(cb.status).toBe(302);
    expect(cb.headers.get('Location')).toBe(`/api/canva/open?upload=${id}`);
    expect(sid).toMatch(/^[0-9a-f]{64}$/);

    const tokenCall = fake.calls.find((c) => c.url.endsWith('/oauth/token'))!;
    expect(tokenCall.headers.get('Authorization')).toBe(`Basic ${btoa('OC-test:cnvca-secret')}`);
    const verifier = new URLSearchParams(tokenCall.body).get('code_verifier')!;
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const expected = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(new URL(open.headers.get('Location')!).searchParams.get('code_challenge')).toBe(expected);

    // Tokens are encrypted at rest and the session is keyed by a hash
    const row = await env.DB.prepare('SELECT sid_hash, tokens FROM canva_sessions').first<{ sid_hash: string; tokens: string }>();
    expect(row!.sid_hash).not.toBe(sid);
    expect(row!.tokens).not.toContain('access-1');
    expect(row!.tokens).not.toContain('refresh-1');
  });

  it('rejects a callback whose state cookie is missing or different (login CSRF)', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const open = await call(fake.deps, `/api/canva/open?upload=${id}`);
    const state = new URL(open.headers.get('Location')!).searchParams.get('state')!;
    expect((await call(fake.deps, `/api/canva/callback?code=good-code&state=${state}`)).status).toBe(400);
    expect((await call(fake.deps, `/api/canva/callback?code=good-code&state=${state}`, { headers: { Cookie: 'ms_canva_oauth=other' } })).status).toBe(400);
    expect(fake.calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(0);
  });

  it('a state can be used only once and expires after ten minutes', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const open = await call(fake.deps, `/api/canva/open?upload=${id}`);
    const state = new URL(open.headers.get('Location')!).searchParams.get('state')!;
    const init = { headers: { Cookie: `ms_canva_oauth=${state}` } };
    expect((await call(fake.deps, `/api/canva/callback?code=good-code&state=${state}`, init)).status).toBe(302);
    expect((await call(fake.deps, `/api/canva/callback?code=good-code&state=${state}`, init)).status).toBe(400);

    const open2 = await call(fake.deps, `/api/canva/open?upload=${id}`);
    const state2 = new URL(open2.headers.get('Location')!).searchParams.get('state')!;
    fake.advance(601);
    expect((await call(fake.deps, `/api/canva/callback?code=good-code&state=${state2}`, { headers: { Cookie: `ms_canva_oauth=${state2}` } })).status).toBe(400);
  });

  it('shows a friendly page when the customer cancels on Canva', async () => {
    const { deps } = fakeCanva();
    const r = await call(deps, '/api/canva/callback?error=access_denied&state=x', { headers: { 'Accept-Language': 'ru-RU' } });
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('Подключение Canva отменено');
  });
});

describe('Edit in Canva: import', () => {
  it('a connected browser gets the opening page with a nonce CSP', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    const r = await call(fake.deps, `/api/canva/open?upload=${id}`, { headers: { Cookie: `ms_canva=${sid}` } });
    expect(r.status).toBe(200);
    const csp = r.headers.get('Content-Security-Policy')!;
    const nonce = csp.match(/script-src 'nonce-([0-9a-f]+)'/)![1];
    const html = await r.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html).toContain(JSON.stringify(id));
  });

  it('imports the uploaded PDF into Canva and returns the edit link', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps, 'Анна & Max ✨');
    const { sid } = await connect(fake, id);
    const r = await call(fake.deps, '/api/canva/import', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: `ms_canva=${sid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload: id }),
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      design_id: 'DAG123',
      edit_url: 'https://www.canva.com/design/DAG123/edit',
      view_url: 'https://www.canva.com/design/DAG123/view',
    });
    const imp = fake.calls.find((c) => c.method === 'POST' && c.url.endsWith('/rest/v1/imports'))!;
    expect(imp.headers.get('Authorization')).toBe('Bearer access-1');
    expect(imp.bytes).toEqual(PDF);
    const meta = JSON.parse(imp.headers.get('Import-Metadata')!);
    expect(meta.mime_type).toBe('application/pdf');
    expect(new TextDecoder().decode(Uint8Array.from(atob(meta.title_base64), (c) => c.charCodeAt(0)))).toBe('Анна & Max ✨');
  });

  it('refuses cross-origin calls, unknown sessions and expired uploads', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    const post = (headers: Record<string, string>, body: unknown) =>
      call(fake.deps, '/api/canva/import', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    expect((await post({ Origin: 'https://evil.example', Cookie: `ms_canva=${sid}` }, { upload: id })).status).toBe(403);
    expect((await post({ Origin: ORIGIN }, { upload: id })).status).toBe(401);
    expect((await post({ Origin: ORIGIN, Cookie: `ms_canva=${'f'.repeat(64)}` }, { upload: id })).status).toBe(401);
    expect((await post({ Origin: ORIGIN, Cookie: `ms_canva=${sid}` }, { upload: 'e'.repeat(32) })).status).toBe(410);
  });

  it('refreshes an expiring access token before importing', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    fake.advance(14400);
    const r = await call(fake.deps, '/api/canva/import', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: `ms_canva=${sid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload: id }),
    });
    expect(r.status).toBe(200);
    const refresh = fake.calls.filter((c) => c.url.endsWith('/oauth/token'))[1];
    expect(new URLSearchParams(refresh.body).get('refresh_token')).toBe('refresh-1');
    expect(fake.calls.find((c) => c.method === 'POST' && c.url.endsWith('/rest/v1/imports'))!.headers.get('Authorization')).toBe('Bearer access-2');
  });

  it('a dead refresh token drops the session and asks to reconnect', async () => {
    const fake = fakeCanva({ refresh: 'dead' });
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    fake.advance(14400);
    const r = await call(fake.deps, '/api/canva/import', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: `ms_canva=${sid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload: id }),
    });
    expect(r.status).toBe(401);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe('reconnect');
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM canva_sessions').first('n')).toBe(0);
  });

  it('a session sealed with a rotated CANVA_TOKEN_KEY just reconnects instead of failing', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    const rotated = testEnv({ CANVA_TOKEN_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(9))) });
    const r = await call(fake.deps, `/api/canva/open?upload=${id}`, { headers: { Cookie: `ms_canva=${sid}` } }, rotated);
    expect(r.status).toBe(302);
    expect(r.headers.get('Location')).toContain('https://www.canva.com/api/oauth/authorize');
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM canva_sessions').first('n')).toBe(0);
  });

  it('surfaces a failed Canva import job', async () => {
    const fake = fakeCanva({ job: 'failed' });
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    const r = await call(fake.deps, '/api/canva/import', {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: `ms_canva=${sid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload: id }),
    });
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe('invalid_file');
  });

  it('disconnect revokes at Canva, forgets the session and clears the cookie', async () => {
    const fake = fakeCanva();
    const id = await upload(fake.deps);
    const { sid } = await connect(fake, id);
    const r = await call(fake.deps, '/api/canva/disconnect', { method: 'POST', headers: { Origin: ORIGIN, Cookie: `ms_canva=${sid}` } });
    expect(r.status).toBe(204);
    expect(setCookie(r, 'ms_canva')).toBe('');
    expect(new URLSearchParams(fake.calls.find((c) => c.url.endsWith('/oauth/revoke'))!.body).get('token')).toBe('refresh-1');
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM canva_sessions').first('n')).toBe(0);
  });
});
