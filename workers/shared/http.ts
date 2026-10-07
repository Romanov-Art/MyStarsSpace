/** JSON response helper; omitting `body` sends an empty response with just the status. */
export function json(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  if (body === undefined) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Comma-separated env var → trimmed, non-empty items. */
export function list(value: string | undefined): string[] {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

const encoder = new TextEncoder();

/** Constant-time string comparison (length mismatch returns early, which leaks only length). */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}

/** True when `Authorization: Bearer <key>` matches one of `keys`. */
export function bearerMatches(request: Request, keys: string[]): boolean {
  const got = request.headers.get('Authorization') ?? '';
  return keys.some((k) => safeEqual(got, `Bearer ${k}`));
}

export class BodyTooLarge extends Error {}

/**
 * Read the request body as text, refusing to buffer more than `max` bytes.
 * Checks Content-Length up front and counts streamed bytes for chunked bodies.
 */
export async function readLimited(request: Request, max: number): Promise<string> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > max) throw new BodyTooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
