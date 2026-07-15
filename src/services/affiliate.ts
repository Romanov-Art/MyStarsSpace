/**
 * Affiliate attribution for our own site.
 *
 * A visitor arriving via https://oursite/?ref=CODE is attributed to that
 * affiliate for 30 days (last-click wins). Attribution is stored in both a
 * first-party cookie and localStorage — the cookie is the portable signal,
 * localStorage is the durable one (Safari ITP caps JS-set cookies at 7 days,
 * so the localStorage mirror is what actually holds the 30-day window on read).
 *
 * The pure helpers (no DOM) are unit-tested; the thin storage wrappers are
 * verified in the browser.
 */
export const AFF_COOKIE = 'aff_ref';
export const AFF_STORAGE = 'aff_ref';
export const AFF_CLICK_GUARD_PREFIX = 'aff_click_sent:';
export const AFF_WINDOW_DAYS = 30;
export const AFF_WINDOW_MS = AFF_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export interface StoredRef {
  ref: string;
  ts: number;
}

/** Valid affiliate code, or null. Shared format with partner ids. */
export function sanitizeRef(raw: string | null | undefined): string | null {
  return raw && ID_RE.test(raw) ? raw : null;
}

/** Is a stored attribution still inside the 30-day window? */
export function isRefFresh(stored: StoredRef | null, now: number): boolean {
  if (!stored || typeof stored.ts !== 'number') return false;
  return now - stored.ts < AFF_WINDOW_MS;
}

/** Parse a StoredRef from a localStorage string; null if malformed/invalid. */
export function parseStoredRef(raw: string | null | undefined): StoredRef | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    const ref = sanitizeRef(obj?.ref);
    if (!ref || typeof obj.ts !== 'number' || !Number.isFinite(obj.ts)) return null;
    return { ref, ts: obj.ts };
  } catch {
    return null;
  }
}

/** Read a raw `aff_ref` value out of a document.cookie string. */
export function readRefCookie(cookieString: string | undefined | null): string | null {
  if (!cookieString) return null;
  for (const part of cookieString.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === AFF_COOKIE) return sanitizeRef(decodeURIComponent(v.join('=')));
  }
  return null;
}

/** Build the Set-Cookie-style string for document.cookie (30-day, Lax). */
export function buildRefCookie(ref: string, secure: boolean): string {
  const attrs = [
    `${AFF_COOKIE}=${encodeURIComponent(ref)}`,
    'path=/',
    `max-age=${Math.floor(AFF_WINDOW_MS / 1000)}`,
    'SameSite=Lax',
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

// --- DOM wrappers (thin; exercised in the browser) ---

/**
 * Capture ?ref= from the URL. On a fresh, valid code: persists attribution
 * (last-click, resets the window) and returns the code for a one-time `click`
 * beacon (once per session per code). Returns null when there is nothing new.
 */
export function captureAffiliateRef(search: string): string | null {
  const ref = sanitizeRef(new URLSearchParams(search).get('ref'));
  if (!ref) return null;

  const now = Date.now();
  try {
    localStorage.setItem(AFF_STORAGE, JSON.stringify({ ref, ts: now } satisfies StoredRef));
  } catch { /* storage unavailable — cookie still set below */ }
  try {
    document.cookie = buildRefCookie(ref, location.protocol === 'https:');
  } catch { /* ignore */ }

  // Fire the click beacon only once per session per code (avoid refresh inflation)
  try {
    const guard = AFF_CLICK_GUARD_PREFIX + ref;
    if (sessionStorage.getItem(guard)) return null;
    sessionStorage.setItem(guard, '1');
  } catch { /* no sessionStorage → still report the click */ }
  return ref;
}

/** Current attributed affiliate code (localStorage first, cookie fallback), or undefined. */
export function getAffiliateRef(): string | undefined {
  try {
    const stored = parseStoredRef(localStorage.getItem(AFF_STORAGE));
    if (stored && isRefFresh(stored, Date.now())) return stored.ref;
    if (stored) localStorage.removeItem(AFF_STORAGE); // expired → clean up
  } catch { /* fall through to cookie */ }
  try {
    return readRefCookie(document.cookie) || undefined;
  } catch {
    return undefined;
  }
}
