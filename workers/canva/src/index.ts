/**
 * canva.mystars.space edge: everything is proxied to the GiftsCanva origin
 * (Dokploy). The render engines need native Skia/resvg, which Workers can't
 * run, so the origin stays; this Worker adds an edge cache for renders.
 *
 * POST /v1/render is deterministic for a given {template_id, meta}, so a PNG
 * result is cached per body hash — but only served to callers presenting a
 * valid API key, so the cache never bypasses origin auth. Everything else
 * (editor/create, OAuth, ACME HTTP-01 challenges, b64 renders) passes through
 * untouched.
 */
import { bearerMatches, list, sha256Hex } from '../../shared/http.js';

export interface Env {
  /** Same comma-separated keys as GiftsCanva's API_KEYS (secret). */
  GIFTSCANVA_API_KEYS?: string;
  /** Edge cache lifetime for a render, seconds. */
  RENDER_CACHE_TTL?: string;
  /** Bump to invalidate every cached render (e.g. after a template change). */
  RENDER_CACHE_VERSION?: string;
}

export type Upstream = (request: Request) => Promise<Response>;

const MAX_CACHEABLE_BODY = 64 * 1024;

/** JSON.stringify with sorted object keys, so key order doesn't split the cache. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function withCacheStatus(response: Response, status: 'HIT' | 'MISS'): Response {
  const out = new Response(response.body, response);
  out.headers.set('X-Render-Cache', status);
  return out;
}

async function renderWithCache(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  upstream: Upstream,
): Promise<Response> {
  // Unauthenticated or oversized: let the origin answer (it returns 401/413)
  if (!bearerMatches(request, list(env.GIFTSCANVA_API_KEYS))) return upstream(request);
  if (Number(request.headers.get('Content-Length') ?? '0') > MAX_CACHEABLE_BODY) return upstream(request);

  const body = await request.text();
  const forward = () => upstream(new Request(request.url, { method: 'POST', headers: request.headers, body }));

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return forward(); // origin produces the proper 400
  }

  const version = env.RENDER_CACHE_VERSION ?? '1';
  const hash = await sha256Hex(`${version}:${stableStringify(parsed)}`);
  const cacheKey = new Request(`${new URL(request.url).origin}/__render-cache/${hash}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return withCacheStatus(hit, 'HIT');

  const response = await forward();
  const type = response.headers.get('Content-Type') ?? '';
  if (response.status === 200 && type.startsWith('image/png')) {
    const ttl = Number(env.RENDER_CACHE_TTL ?? '86400');
    const cacheable = new Response(response.clone().body, {
      headers: { 'Content-Type': type, 'Cache-Control': `public, max-age=${ttl}` },
    });
    ctx.waitUntil(cache.put(cacheKey, cacheable));
  }
  return withCacheStatus(response, 'MISS');
}

export async function handleCanva(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  upstream: Upstream,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/v1/render' && !url.searchParams.has('format')) {
    return renderWithCache(request, env, ctx, upstream);
  }
  return upstream(request);
}

export default {
  // On a route, a subrequest to the same URL goes to the origin behind the
  // proxied DNS record (GiftsCanva on Dokploy), not back into this Worker.
  fetch: (request, env, ctx) => handleCanva(request, env, ctx, (r) => fetch(r)),
} satisfies ExportedHandler<Env>;
