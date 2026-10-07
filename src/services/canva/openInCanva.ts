/**
 * "Edit in Canva" client flow. The Canva part (OAuth, import) runs in a
 * top-level popup on mystars.space so it works even when the editor is
 * embedded in a partner's iframe. The popup must be opened synchronously in
 * the click handler (popup blockers), so it starts on a local "preparing"
 * page and is pointed at the server once the PDF is uploaded.
 */

export async function fetchCanvaConfigured(): Promise<boolean> {
  try {
    const r = await fetch('/api/canva/status', { cache: 'no-store' });
    return r.ok && ((await r.json()) as { configured?: boolean }).configured === true;
  } catch {
    return false;
  }
}

export class PopupBlockedError extends Error {}

/** Call synchronously from the click handler, before any await. */
export function openCanvaWindow(preparingText: string, lang: string): Window {
  const win = window.open('', 'mystars-canva');
  if (!win) throw new PopupBlockedError('popup blocked');
  const esc = preparingText.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  win.document.open();
  win.document.write(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#f2f2f5;
font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}.s{width:40px;height:40px;margin:0 auto 16px;border-radius:50%;
border:3px solid #2a2d36;border-top-color:#e84040;animation:r .9s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style>
</head><body><div style="text-align:center"><div class="s" role="status"></div>${esc}</div></body></html>`);
  win.document.close();
  return win;
}

/** Uploads the PDF and hands the popup over to the server-side Canva flow. */
export async function sendToCanva(win: Window, pdf: Blob, title: string): Promise<void> {
  const r = await fetch('/api/canva/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf', 'X-Design-Title': encodeURIComponent(title.slice(0, 50)) },
    body: pdf,
  });
  const data = (await r.json().catch(() => ({}))) as { upload_id?: string; error?: { message?: string } };
  if (!r.ok || !data.upload_id) throw new Error(data.error?.message || `HTTP ${r.status}`);
  win.location.href = new URL(`/api/canva/open?upload=${data.upload_id}`, window.location.origin).href;
}
