/**
 * mystars.space edge: the landing is served straight from Workers Static
 * Assets (no Worker invocation); only /api/* and /templates/* run this code
 * (see `run_worker_first` in wrangler.jsonc).
 */
import { json } from '../../shared/http.js';
import { handleApi, type TrackEnv } from './track.js';

export interface Env extends TrackEnv {
  ASSETS: Fetcher;
}

/**
 * Partner templates are fetched by the app as JSON. With SPA fallback on, a
 * missing file would come back as index.html with 200; return a real 404 so
 * callers can tell "no such template" apart from a template.
 */
async function serveTemplate(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  const isJsonPath = new URL(request.url).pathname.endsWith('.json');
  const isHtml = (response.headers.get('Content-Type') ?? '').includes('text/html');
  if (isJsonPath && isHtml) return json(404, { error: 'not found' });
  return response;
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    if (pathname.startsWith('/templates/')) return serveTemplate(request, env);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
