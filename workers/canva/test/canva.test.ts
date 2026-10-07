import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { handleCanva, type Env } from '../src/index.js';

const URL_RENDER = 'https://canva.mystars.space/v1/render';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

/** Fake origin that records every request it receives. */
function origin(respond: (req: Request) => Response = () => new Response(PNG, { headers: { 'Content-Type': 'image/png' } })) {
  const calls: { method: string; url: string; body: string }[] = [];
  const upstream = async (req: Request) => {
    calls.push({ method: req.method, url: req.url, body: await req.clone().text() });
    return respond(req);
  };
  return { calls, upstream };
}

let seq = 0;
async function call(
  upstream: (r: Request) => Promise<Response>,
  init: { url?: string; method?: string; key?: string | null; body?: string } = {},
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.key !== null) headers.Authorization = `Bearer ${init.key ?? 'good-key'}`;
  const request = new Request(init.url ?? URL_RENDER, {
    method: init.method ?? 'POST',
    headers,
    body: init.method === 'GET' ? undefined : init.body,
  });
  const ctx = createExecutionContext();
  const response = await handleCanva(request, env as unknown as Env, ctx, upstream);
  await waitOnExecutionContext(ctx);
  return response;
}
/** A body unique to each test so the shared edge cache never crosses tests. */
const uniqueBody = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ template_id: 'starmap-classic-black-30x40', meta: { seq: ++seq, ...extra } });

describe('canva proxy', () => {
  it('passes non-render requests straight to the origin', async () => {
    const { calls, upstream } = origin(() => new Response('{"ok":true}'));
    const r = await call(upstream, { url: 'https://canva.mystars.space/healthz', method: 'GET', key: null });
    expect(await r.text()).toBe('{"ok":true}');
    expect(calls).toHaveLength(1);
  });

  it('passes ACME HTTP-01 challenges through untouched', async () => {
    const { calls, upstream } = origin(() => new Response('token.thumbprint'));
    const r = await call(upstream, { url: 'http://canva.mystars.space/.well-known/acme-challenge/abc', method: 'GET', key: null });
    expect(await r.text()).toBe('token.thumbprint');
    expect(calls[0].url).toBe('http://canva.mystars.space/.well-known/acme-challenge/abc');
  });

  it('caches a successful render: second identical call never reaches the origin', async () => {
    const { calls, upstream } = origin();
    const body = uniqueBody();
    const first = await call(upstream, { body });
    expect(first.headers.get('X-Render-Cache')).toBe('MISS');
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(PNG);

    const second = await call(upstream, { body });
    expect(second.headers.get('X-Render-Cache')).toBe('HIT');
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(PNG);
    expect(calls).toHaveLength(1);
  });

  it('treats key order in the JSON body as the same render', async () => {
    const { calls, upstream } = origin();
    const n = ++seq;
    await call(upstream, { body: JSON.stringify({ template_id: 't', meta: { a: 1, b: n } }) });
    const r = await call(upstream, { body: JSON.stringify({ meta: { b: n, a: 1 }, template_id: 't' }) });
    expect(r.headers.get('X-Render-Cache')).toBe('HIT');
    expect(calls).toHaveLength(1);
  });

  it('never serves the cache to a caller without a valid key', async () => {
    const { calls, upstream } = origin((req) =>
      req.headers.get('Authorization') === 'Bearer good-key'
        ? new Response(PNG, { headers: { 'Content-Type': 'image/png' } })
        : new Response('{"error":{"code":"unauthorized"}}', { status: 401 }),
    );
    const body = uniqueBody();
    await call(upstream, { body }); // warm the cache with a valid key
    const anon = await call(upstream, { body, key: null });
    const wrong = await call(upstream, { body, key: 'stolen' });
    expect(anon.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(calls).toHaveLength(3); // both unauthorized calls went to the origin
  });

  it('does not cache errors or non-PNG responses', async () => {
    const { calls, upstream } = origin(() => new Response('{"error":{"code":"validation_error"}}', { status: 422 }));
    const body = uniqueBody();
    expect((await call(upstream, { body })).status).toBe(422);
    expect((await call(upstream, { body })).status).toBe(422);
    expect(calls).toHaveLength(2);
  });

  it('forwards the exact request body on a miss', async () => {
    const { calls, upstream } = origin();
    const body = uniqueBody({ city: 'Paris' });
    await call(upstream, { body });
    expect(calls[0]).toMatchObject({ method: 'POST', url: URL_RENDER, body });
  });

  it('bypasses the cache for base64 renders and invalid JSON', async () => {
    const { calls, upstream } = origin(() => new Response('{"b64":"..."}', { headers: { 'Content-Type': 'application/json' } }));
    const body = uniqueBody();
    await call(upstream, { url: `${URL_RENDER}?format=b64`, body });
    await call(upstream, { url: `${URL_RENDER}?format=b64`, body });
    await call(upstream, { body: '{broken' });
    expect(calls).toHaveLength(3);
  });

  it('accepts any of several configured keys', async () => {
    const { calls, upstream } = origin();
    const body = uniqueBody();
    await call(upstream, { body, key: 'second-key' });
    const r = await call(upstream, { body, key: 'second-key' });
    expect(r.headers.get('X-Render-Cache')).toBe('HIT');
    expect(calls).toHaveLength(1);
  });
});
