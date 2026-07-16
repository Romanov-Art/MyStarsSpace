/**
 * Billing / attribution beacons. Fire-and-forget: tracking must never affect
 * the user experience, so every failure path is swallowed.
 *
 * Two contexts, same endpoint:
 *  - partner: whitelabel embed generations (billed per export)
 *  - ref:     affiliate that referred the visitor to our own site
 * A payload may carry either, both, or neither (organic on our own site).
 */
export type TrackEvent = 'view' | 'export' | 'click';

const VIEW_SENT_KEY = 'starmap-view-sent';

interface TrackContext {
  partner?: string;
  ref?: string;
}

export function track(event: TrackEvent, ctx: TrackContext = {}): void {
  try {
    const body: Record<string, string> = { event };
    if (ctx.partner) body.partner = ctx.partner;
    if (ctx.ref) body.ref = ctx.ref;
    const payload = JSON.stringify(body);
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

/** Convenience for a partner-embed export/view. */
export function trackPartnerEvent(
  partnerId: string | undefined,
  event: TrackEvent,
  ref?: string,
): void {
  if (!partnerId && !ref) return;
  track(event, { partner: partnerId, ref });
}

/** Track the page/embed view once per browser session per partner. */
export function trackPartnerViewOnce(partnerId: string | undefined): void {
  if (!partnerId) return;
  try {
    // Namespaced per partner: visiting partner A then B in one session must
    // count a view for each
    const guard = `${VIEW_SENT_KEY}:${partnerId}`;
    if (sessionStorage.getItem(guard)) return;
    sessionStorage.setItem(guard, '1');
  } catch { /* sessionStorage unavailable → still track, just without the guard */ }
  trackPartnerEvent(partnerId, 'view');
}

/** Report an affiliate referral click (dedupe is handled by the caller). */
export function trackAffiliateClick(ref: string): void {
  track('click', { ref });
}
