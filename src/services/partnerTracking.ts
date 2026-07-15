/**
 * Billing beacons for partner embeds. Fire-and-forget: tracking must never
 * affect the user experience, so every failure path is swallowed.
 */
export type PartnerEvent = 'view' | 'export';

const VIEW_SENT_KEY = 'starmap-view-sent';

export function trackPartnerEvent(partnerId: string | undefined, event: PartnerEvent): void {
  if (!partnerId) return;
  try {
    const payload = JSON.stringify({ partner: partnerId, event });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* never break the app over tracking */ }
}

/** Track the embed view once per browser session. */
export function trackPartnerViewOnce(partnerId: string | undefined): void {
  if (!partnerId) return;
  try {
    if (sessionStorage.getItem(VIEW_SENT_KEY)) return;
    sessionStorage.setItem(VIEW_SENT_KEY, '1');
  } catch { /* sessionStorage unavailable → still track, just without the guard */ }
  trackPartnerEvent(partnerId, 'view');
}
