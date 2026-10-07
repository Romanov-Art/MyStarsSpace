/**
 * Pages shown in the "Edit in Canva" popup. Self-contained (no assets),
 * locked down with a nonce-based CSP.
 */
import { randomHex } from '../../shared/http.js';

const TEXT = {
  en: {
    title: 'Opening Canva…',
    opening: 'Preparing your design in Canva…',
    hint: 'This usually takes a few seconds.',
    error: 'Couldn’t open the design in Canva.',
    retry: 'Try again',
    close: 'Close',
    expired: 'This link has expired. Go back to MyStarsSpace and press “Edit in Canva” again.',
    cancelled: 'Canva connection was cancelled. You can close this window.',
    failed: 'Canva didn’t confirm the connection. Close this window and try again.',
  },
  ru: {
    title: 'Открываем Canva…',
    opening: 'Готовим ваш дизайн в Canva…',
    hint: 'Обычно это занимает несколько секунд.',
    error: 'Не удалось открыть дизайн в Canva.',
    retry: 'Попробовать снова',
    close: 'Закрыть',
    expired: 'Ссылка устарела. Вернитесь в MyStarsSpace и снова нажмите «Редактировать в Canva».',
    cancelled: 'Подключение Canva отменено. Это окно можно закрыть.',
    failed: 'Canva не подтвердила подключение. Закройте окно и попробуйте ещё раз.',
  },
} as const;

type Kind = 'expired' | 'cancelled' | 'failed';

const STYLE = `
  :root { color-scheme: light dark; --bg:#0b0d12; --fg:#f2f2f5; --muted:#9aa0ad; --accent:#e84040; }
  @media (prefers-color-scheme: light) { :root { --bg:#f6f6f8; --fg:#15161a; --muted:#5f6470; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
         background:var(--bg); color:var(--fg); font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; text-align:center; }
  main { max-width:420px; }
  .spinner { width:40px; height:40px; margin:0 auto 20px; border-radius:50%;
             border:3px solid color-mix(in srgb, var(--fg) 15%, transparent); border-top-color:var(--accent);
             animation:spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 3s; } }
  h1 { font-size:18px; font-weight:600; margin:0 0 6px; }
  p { margin:0; color:var(--muted); }
  button { margin-top:20px; padding:10px 18px; border:0; border-radius:8px; background:var(--accent); color:#fff; font:inherit; cursor:pointer; }
  [hidden] { display:none !important; }
`;

function page(status: number, lang: 'en' | 'ru', body: string, script = '', cookies: string[] = []): Response {
  const nonce = randomHex(16);
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${TEXT[lang].title}</title><style nonce="${nonce}">${STYLE}</style></head>
<body><main>${body}</main>${script ? `<script nonce="${nonce}">${script}</script>` : ''}</body></html>`;
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(html, { status, headers });
}

/** Shown while the import runs; on success it replaces itself with the Canva editor. */
export function openingPage(ru: boolean, uploadId: string): Response {
  const lang = ru ? 'ru' : 'en';
  const t = TEXT[lang];
  const body = `
    <div id="busy"><div class="spinner" role="status" aria-label="${t.opening}"></div>
      <h1>${t.opening}</h1><p>${t.hint}</p></div>
    <div id="fail" hidden><h1>${t.error}</h1><p id="why"></p><button id="retry" type="button">${t.retry}</button></div>`;
  const script = `
    const upload = ${JSON.stringify(uploadId)};
    const busy = document.getElementById('busy'), fail = document.getElementById('fail'), why = document.getElementById('why');
    async function run() {
      busy.hidden = false; fail.hidden = true;
      try {
        const r = await fetch('/api/canva/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upload }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.edit_url) return location.replace(d.edit_url);
        if (d.error && d.error.code === 'reconnect') return location.replace('/api/canva/open?upload=' + encodeURIComponent(upload));
        why.textContent = (d.error && d.error.message) || ('HTTP ' + r.status);
      } catch (e) { why.textContent = String(e && e.message || e); }
      busy.hidden = true; fail.hidden = false;
    }
    document.getElementById('retry').addEventListener('click', run);
    run();`;
  return page(200, lang, body, script);
}

export function messagePage(status: number, ru: boolean, kind: Kind, cookies: string[] = []): Response {
  const lang = ru ? 'ru' : 'en';
  const t = TEXT[lang];
  const body = `<h1>${kind === 'cancelled' ? 'Canva' : t.error}</h1><p>${t[kind]}</p><button id="close" type="button">${t.close}</button>`;
  return page(status, lang, body, `document.getElementById('close').addEventListener('click', () => window.close());`, cookies);
}
