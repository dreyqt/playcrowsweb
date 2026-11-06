import type { PlayCrowsServer } from '../server'

export function isLimitedBoostingPackage(server: PlayCrowsServer, packageId: string | null) {
  return server === 'v1' && /^boosting-(50|200|500|1000)$/.test(packageId ?? '')
}

export class BoostingPurchaseLimitError extends Error {}

/** Check the entered Login ID before showing any payment instructions. */
export async function checkBoostingPurchaseEligibility(
  server: PlayCrowsServer,
  selectedPackageId: string | null,
  playerId: string,
  signal?: AbortSignal,
  paypalOrderId?: string | null,
) {
  if (!isLimitedBoostingPackage(server, selectedPackageId)) return
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Purchase availability is not configured.')

  const response = await fetch(`${url}/functions/v1/paypal-checkout`, {
    method: 'POST',
    headers: { apikey: key, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'check-boosting-eligibility', server, selectedPackageId, playerId: playerId.trim(), ...(paypalOrderId ? { paypalOrderId } : {}) }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
  })
  const payload = await response.json().catch(() => null)
  if (payload?.code === 'V1_BOOSTING_LIMIT') throw new BoostingPurchaseLimitError('This tier has already been purchased or reserved.')
  if (!response.ok || payload?.eligible !== true) throw new Error('Unable to check purchase availability.')
}
