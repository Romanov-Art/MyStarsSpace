import { SELF, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

const BASE = 'https://mystars.space';
const ADMIN = { Authorization: 'Bearer test-admin' };
const OWN_ORIGIN = 'https://mystars.space';
const month = () => new Date().toISOString().slice(0, 7);

let ipSeq = 0;
/** Each test gets its own client IP so per-IP caps and rate limits don't leak between tests. */
function track(body: unknown, opts: { origin?: string; ip?: string } = {}) {
  return SELF.fetch(`${BASE}/api/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: opts.origin ?? OWN_ORIGIN,
      'CF-Connecting-IP': opts.ip ?? `198.51.100.${ipSeq}`,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
function credit(partner: string, amount: number) {
  return SELF.fetch(`${BASE}/api/credits`, {
    method: 'POST',
    headers: { ...ADMIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner, amount, note: 'test' }),
  });
}
const status = async (partner: string) =>
  (await (await SELF.fetch(`${BASE}/api/status?partner=${partner}`)).json()) as { blocked: boolean };

beforeEach(async () => {
  ipSeq += 1;
  await env.DB.batch([env.DB.prepare('DELETE FROM events'), env.DB.prepare('DELETE FROM credits')]);
});

describe('track API on D1', () => {
  it('health', async () => {
    const r = await SELF.fetch(`${BASE}/api/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it('unknown api route → 404', async () => {
    expect((await SELF.fetch(`${BASE}/api/nope`)).status).toBe(404);
  });

  it('rejects foreign and lookalike origins', async () => {
    expect((await track({ event: 'view', partner: 'acme' }, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await track({ event: 'view', partner: 'acme' }, { origin: 'https://mystars.space.evil.com' })).status).toBe(403);
  });

  it('accepts Referer when Origin is absent', async () => {
    const r = await SELF.fetch(`${BASE}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://mystars.space/?partner=acme', 'CF-Connecting-IP': '203.0.113.9' },
      body: JSON.stringify({ event: 'view', partner: 'acme' }),
    });
    expect(r.status).toBe(204);
  });

  it('validates payload: needs a billing context and a known event', async () => {
    expect((await track({ event: 'view' })).status).toBe(400);
    expect((await track({ event: 'hack', partner: 'acme' })).status).toBe(400);
    expect((await track({ event: 'view', partner: 'bad id!' })).status).toBe(400);
    expect((await track('{not json')).status).toBe(400);
    expect((await track({ event: 'view', partner: 'acme' })).status).toBe(204);
  });

  it('refuses bodies over 512 bytes with 413', async () => {
    expect((await track({ event: 'view', partner: 'acme', pad: 'x'.repeat(600) })).status).toBe(413);
  });

  it('prepaid flow: blocked → credited → export consumes a credit', async () => {
    expect(await status('acme')).toEqual({ blocked: true });

    const c = await credit('acme', 2);
    expect(c.status).toBe(200);
    expect(await c.json()).toEqual({ partner: 'acme', remaining: 2 });
    expect(await status('acme')).toEqual({ blocked: false });

    expect((await track({ event: 'export', partner: 'acme' })).status).toBe(204);
    expect((await track({ event: 'export', partner: 'acme' })).status).toBe(204);
    expect(await status('acme')).toEqual({ blocked: true }); // 2 - 2 = 0 → blocked

    const report = (await (await SELF.fetch(`${BASE}/api/report?month=${month()}`, { headers: ADMIN })).json()) as {
      partners: { partner: string; exports: number; remaining: number }[];
    };
    expect(report.partners).toEqual([{ partner: 'acme', exports: 2, views: 0, flagged: 0, remaining: 0 }]);
  });

  it('credited partners appear in the report even without activity', async () => {
    await credit('quiet', 5);
    const report = (await (await SELF.fetch(`${BASE}/api/report?month=${month()}`, { headers: ADMIN })).json()) as {
      partners: unknown[];
    };
    expect(report.partners).toEqual([{ partner: 'quiet', exports: 0, views: 0, flagged: 0, remaining: 5 }]);
  });

  it('flags exports beyond the per-IP daily cap instead of billing them', async () => {
    await credit('capped', 100);
    for (let i = 0; i < 12; i++) await track({ event: 'export', partner: 'capped' }, { ip: '192.0.2.77' });
    const report = (await (await SELF.fetch(`${BASE}/api/report?month=${month()}`, { headers: ADMIN })).json()) as {
      partners: { exports: number; flagged: number; remaining: number }[];
    };
    expect(report.partners[0]).toMatchObject({ exports: 10, flagged: 2, remaining: 90 });
  });

  it('affiliate report counts clicks and conversions', async () => {
    await track({ event: 'click', ref: 'blogger' });
    await track({ event: 'export', ref: 'blogger' });
    const r = (await (await SELF.fetch(`${BASE}/api/affiliate-report?month=${month()}`, { headers: ADMIN })).json()) as {
      affiliates: unknown[];
    };
    expect(r.affiliates).toEqual([{ ref: 'blogger', clicks: 1, conversions: 1, flagged: 0 }]);
  });

  it('admin endpoints require the token', async () => {
    expect((await SELF.fetch(`${BASE}/api/report`)).status).toBe(401);
    expect((await SELF.fetch(`${BASE}/api/report`, { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
    expect((await credit('x', 1).then(() => SELF.fetch(`${BASE}/api/credits`, { method: 'POST', body: '{}' }))).status).toBe(401);
  });

  it('validates credit amounts and report month', async () => {
    const bad = await SELF.fetch(`${BASE}/api/credits`, {
      method: 'POST',
      headers: { ...ADMIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner: 'acme', amount: 1.5 }),
    });
    expect(bad.status).toBe(400);
    expect((await SELF.fetch(`${BASE}/api/report?month=2026-1`, { headers: ADMIN })).status).toBe(400);
  });

  it('status is publicly cacheable for a minute and exposes only the flag', async () => {
    const r = await SELF.fetch(`${BASE}/api/status?partner=acme`);
    expect(r.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await r.json()).toEqual({ blocked: true });
  });

  it('stores IPs only as HMAC hashes', async () => {
    await track({ event: 'view', partner: 'acme' }, { ip: '203.0.113.50' });
    const row = await env.DB.prepare('SELECT ip_hash FROM events').first<{ ip_hash: string }>();
    expect(row?.ip_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(row?.ip_hash).not.toContain('203.0.113.50');
  });
});
