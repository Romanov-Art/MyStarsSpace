/**
 * Prepaid-credits status for partner embeds.
 *
 * Fail-open by design: if the status endpoint is down or answers garbage we
 * return `false` (not blocked) — an outage must not halt a partner's sales.
 * The server still counts exports, so the economics survive either way.
 */
export async function fetchPartnerBlocked(partnerId: string | undefined): Promise<boolean> {
  if (!partnerId) return false;
  try {
    const r = await fetch(`/api/status?partner=${encodeURIComponent(partnerId)}`);
    if (!r.ok) return false;
    const data = await r.json();
    return data?.blocked === true;
  } catch {
    return false;
  }
}
