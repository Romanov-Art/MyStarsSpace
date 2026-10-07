import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

const BASE = 'https://mystars.space';

describe('landing static assets', () => {
  it('serves the app shell with revalidation', async () => {
    const r = await SELF.fetch(`${BASE}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Type')).toContain('text/html');
    expect(await r.text()).toContain('<html lang="en"');
  });

  it('falls back to the app shell for unknown pages (SPA)', async () => {
    const r = await SELF.fetch(`${BASE}/some/spa/route`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Type')).toContain('text/html');
  });

  it('serves partner templates as JSON', async () => {
    const r = await SELF.fetch(`${BASE}/templates/partners/demo.json`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Type')).toContain('application/json');
    expect(await r.json()).toBeTypeOf('object');
  });

  it('missing partner template is a real 404, not the HTML shell', async () => {
    const r = await SELF.fetch(`${BASE}/templates/partners/nope.json`);
    expect(r.status).toBe(404);
    expect(r.headers.get('Content-Type')).toContain('application/json');
  });

  it('every poster-size tooltip exists', async () => {
    for (const size of ['10x15', 'A4', '30x40', '40x50', '40x60', '50x70']) {
      const r = await SELF.fetch(`${BASE}/tooltip/${size}.jpg`);
      expect(r.status, size).toBe(200);
      expect(r.headers.get('Content-Type'), size).toContain('image/jpeg');
    }
  });
});
