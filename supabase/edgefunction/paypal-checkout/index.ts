import { withSupabase } from 'npm:@supabase/server@^1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PACKAGE_QUANTITY = 999
const V1_BOOSTING_LIMIT_MESSAGE = 'Each V1 Boosting package can be purchased only once per account. This tier is already purchased or awaiting payment review.'

function isV1Boosting(server: string, packageId: string) {
  return server === 'v1' && /^boosting-(50|200|500|1000)$/.test(packageId)
}

function boostingLimitResponse(message = V1_BOOSTING_LIMIT_MESSAGE) {
  return jsonResponse({ error: message, code: 'V1_BOOSTING_LIMIT' }, 409)
}

async function checkBoostingEligibility(client: any, playerId: string, packageId: string, paypalOrderId: string | null = null) {
  const { data, error } = await client.rpc('check_v1_boosting_eligibility', {
    p_player_id: playerId, p_package_id: packageId, p_paypal_order_id: paypalOrderId,
  })
  if (error) throw new Error('Unable to check purchase eligibility. Please try again before paying.')
  return data === true
}

interface GiftPackageDefinition {
  title: string
  amount: number
}

/* Keep synchronized with src/giftPackageData.ts and submit-donation. */
const V1_GIFT_PACKAGES: Record<string, GiftPackageDefinition> = {
  'november-supply-50': { title: 'NOVEMBER PACKAGE', amount: 50 },
  'november-supply-100': { title: 'NOVEMBER PACKAGE', amount: 100 },
  'november-supply-200': { title: 'NOVEMBER PACKAGE', amount: 200 },
  'november-supply-500': { title: 'NOVEMBER PACKAGE', amount: 500 },
  'november-supply-1000': { title: 'NOVEMBER PACKAGE', amount: 1000 },
  'currency-5': { title: 'Diamond Package', amount: 5 },
  'currency-10': { title: 'Diamond Package', amount: 10 },
  'currency-50': { title: 'Diamond Package', amount: 50 },
  'currency-100': { title: 'Diamond Package', amount: 100 },
  'currency-200': { title: 'Diamond Package', amount: 200 },
  'currency-500': { title: 'Diamond Package', amount: 500 },
  'currency-1000': { title: 'Diamond Package', amount: 1000 },
  'support-skill-bundle': { title: 'SKILL BUNDLE', amount: 15 },
  'support-guild-bundle': { title: 'GUILD BUNDLE', amount: 20 },
  'support-job-advance': { title: 'JOB ADVANCE PACKAGE', amount: 25 },
  'support-awakening': { title: 'AWAKENING PACKAGE', amount: 25 },
  'support-alchemy-pack': { title: 'ALCHEMY PACK', amount: 20 },
  'support-nc-gears-starter': { title: 'NC GEARS STARTER', amount: 100 },
  'support-4th-job-advance': { title: '4TH JOB ADVANCE PACK', amount: 200 },
  'support-change-character-name': { title: 'CHANGE CHARACTER NAME', amount: 200 },
  'support-intermediate-codex': { title: 'INTERMEDIATE CODEX', amount: 100 },
  'support-blessing-exp': { title: 'BLESSING EXP', amount: 100 },
  'support-class-change-50': { title: 'CLASS CHANGE', amount: 50 },
  'support-class-change-200': { title: 'CLASS CHANGE', amount: 200 },
  'support-class-change-500': { title: 'CLASS CHANGE', amount: 500 },
  'september-supply-50': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 50 },
  'september-supply-100': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 100 },
  'september-supply-500': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 500 },
  'september-supply-1000': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 1000 },
  'october-supply-50': { title: 'OCTOBER PACKAGE', amount: 50 },
  'october-supply-100': { title: 'OCTOBER PACKAGE', amount: 100 },
  'october-supply-500': { title: 'OCTOBER PACKAGE', amount: 500 },
  'october-supply-1000': { title: 'OCTOBER PACKAGE', amount: 1000 },
  'boosting-50': { title: 'BOOSTING PACKAGE', amount: 50 },
  'boosting-200': { title: 'BOOSTING PACKAGE', amount: 200 },
  'boosting-500': { title: 'BOOSTING PACKAGE', amount: 500 },
  'boosting-1000': { title: 'BOOSTING PACKAGE', amount: 1000 },
}


// Retain V2 prices to verify payments already completed before the server merge.
const V2_GIFT_PACKAGES: Record<string, GiftPackageDefinition> = {
  'currency-5': { title: 'Diamond Package', amount: 5 },
  'currency-10': { title: 'Diamond Package', amount: 10 },
  'currency-50': { title: 'Diamond Package', amount: 50 },
  'currency-100': { title: 'Diamond Package', amount: 100 },
  'currency-200': { title: 'Diamond Package', amount: 200 },
  'currency-500': { title: 'Diamond Package', amount: 500 },
  'currency-1000': { title: 'Diamond Package', amount: 1000 },
  'support-skill-bundle': { title: 'SKILL BUNDLE', amount: 15 },
  'support-guild-bundle': { title: 'GUILD BUNDLE', amount: 20 },
  'support-job-advance': { title: 'JOB ADVANCE PACKAGE', amount: 25 },
  'support-nc-gears-starter': { title: 'NC GEARS STARTER', amount: 100 },
  'support-4th-job-advance': { title: '4TH JOB ADVANCE PACK', amount: 200 },
  'support-change-character-name': { title: 'CHANGE CHARACTER NAME', amount: 200 },
  'support-class-change-50': { title: 'CLASS CHANGE', amount: 50 },
  'support-class-change-200': { title: 'CLASS CHANGE', amount: 200 },
  'support-class-change-500': { title: 'CLASS CHANGE', amount: 500 },
  'september-supply-50': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 50 },
  'september-supply-100': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 100 },
  'september-supply-500': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 500 },
  'september-supply-1000': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 1000 },
  'october-supply-50': { title: 'OCTOBER PACKAGE', amount: 50 },
  'october-supply-100': { title: 'OCTOBER PACKAGE', amount: 100 },
  'october-supply-500': { title: 'OCTOBER PACKAGE', amount: 500 },
  'october-supply-1000': { title: 'OCTOBER PACKAGE', amount: 1000 },
  'boosting-50': { title: 'BOOSTING PACKAGE', amount: 50 },
  'boosting-200': { title: 'BOOSTING PACKAGE', amount: 200 },
  'boosting-500': { title: 'BOOSTING PACKAGE', amount: 500 },
  'boosting-1000': { title: 'BOOSTING PACKAGE', amount: 1000 },
}
const GIFT_PACKAGES_BY_SERVER = { v1: V1_GIFT_PACKAGES, v2: V2_GIFT_PACKAGES } as const
type PlayCrowsServer = keyof typeof GIFT_PACKAGES_BY_SERVER

function parseServer(value: unknown): PlayCrowsServer | null {
  return value === 'v1' || value === 'v2' ? value : null
}

const EARLY_PROMO_CODE = 'WEEKEND10'
const EARLY_PROMO_DISCOUNT_PERCENT = 10
// Exclusive cutoff: September 28, 2026 at 00:00 Singapore / GMT+8.
// Keep synchronized with src/promo.ts, submit-donation and recover-paypal-payment.
const EARLY_PROMO_END_TIMESTAMP = Date.parse('2026-09-27T16:00:00.000Z')

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

function mergedServerResponse() {
  return jsonResponse({ error: 'V2 has merged into V1. Please refresh the shop and purchase through V1.', code: 'V2_MERGED' }, 410)
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function buildCustomId(server: PlayCrowsServer, playerId: string, username: string) {
  // Keep Player ID in the legacy webhook's Username slot and Character in slot 4.
  // Server is stored in slot 3 so the V1/V2 metadata does not shift the webhook fields.
  return `PC|${playerId.trim()}|${server.toUpperCase()}|${username.trim()}`.slice(0, 127)
}

// Read the package/account from PayPal, never from capture request parameters.
function trustedPayPalPackage(order: any, server: PlayCrowsServer) {
  if (order?.purchase_units?.length !== 1) throw new Error('Invalid PlayCrows PayPal order.')
  const unit = order.purchase_units[0]
  const parts = String(unit.custom_id ?? '').split('|')
  const current = parts[2]?.toLowerCase()
  const legacy = parts[1]?.toLowerCase()
  const identity = current === 'v1' || current === 'v2'
    ? { server: current, playerId: parts[1]?.trim() }
    : { server: legacy, playerId: parts[2]?.trim() }
  const description = String(unit.description ?? '').match(/^(.*?)\s+×(\d+)\s+\|\s+PlayCrows\s+(V1|V2)$/i)
  if (parts[0] !== 'PC' || !identity.playerId || identity.server !== server || !description || description[3].toLowerCase() !== server) {
    throw new Error('The PayPal order does not match this PlayCrows server or account.')
  }
  const quantity = Number(description[2])
  const amount = Number(unit.amount?.value)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PACKAGE_QUANTITY || unit.amount?.currency_code !== 'USD' || !Number.isFinite(amount)) {
    throw new Error('The PayPal package amount or quantity is invalid.')
  }
  const candidates = Object.entries(GIFT_PACKAGES_BY_SERVER[server]).filter(([, item]) =>
    item.title === description[1].trim() && (Math.abs(item.amount * quantity - amount) < 0.001 ||
      Math.abs(roundMoney(item.amount * quantity * (1 - EARLY_PROMO_DISCOUNT_PERCENT / 100)) - amount) < 0.001))
  if (candidates.length !== 1) throw new Error('The PayPal order package could not be verified.')
  return { playerId: identity.playerId, packageId: candidates[0][0], quantity }
}

function getPayPalBaseUrl() {
  return Deno.env.get('PAYPAL_ENV')?.toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

function getPayPalCredentials(server: PlayCrowsServer) {
  const suffix = server.toUpperCase()
  const clientId = Deno.env.get(`PAYPAL_CLIENT_ID_${suffix}`) || Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get(`PAYPAL_CLIENT_SECRET_${suffix}`) || Deno.env.get('PAYPAL_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('PayPal server credentials are not configured.')
  }

  return { clientId, clientSecret }
}

async function getPayPalAccessToken(server: PlayCrowsServer) {
  const { clientId, clientSecret } = getPayPalCredentials(server)
  const auth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    console.error('PayPal OAuth error:', payload)
    throw new Error('Unable to authenticate with PayPal.')
  }

  return String(payload.access_token)
}

function calculateAmount(server: PlayCrowsServer, packageDefinition: GiftPackageDefinition, quantity: number, promoCode: string) {
  const originalAmount = roundMoney(packageDefinition.amount * quantity)
  if (!promoCode) return originalAmount
  if (promoCode !== EARLY_PROMO_CODE) {
    throw new Error('Invalid redeem code.')
  }
  if (Date.now() >= EARLY_PROMO_END_TIMESTAMP) {
    throw new Error('The WEEKEND10 promotion has expired.')
  }
  return roundMoney(originalAmount * (1 - EARLY_PROMO_DISCOUNT_PERCENT / 100))
}

export default {
  fetch: withSupabase(
    { auth: 'publishable' },
    async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON request.' }, 400)
  }

  const action = String(body.action ?? '').trim().toLowerCase()

  try {
    if (action === 'check-boosting-eligibility') {
      const server = parseServer(body.server)
      if (server === 'v2') return mergedServerResponse()
      const packageId = String(body.selectedPackageId ?? '').trim()
      const playerId = String(body.playerId ?? '').trim()
      const paypalOrderId = String(body.paypalOrderId ?? '').trim() || null
      if (!server || !GIFT_PACKAGES_BY_SERVER[server][packageId] || !playerId || playerId.length > 100) {
        return jsonResponse({ error: 'Please provide a valid server, package and account.' }, 400)
      }
      if (paypalOrderId && !/^[A-Z0-9]+$/i.test(paypalOrderId)) return jsonResponse({ error: 'Invalid PayPal order ID.' }, 400)
      if (isV1Boosting(server, packageId) && !await checkBoostingEligibility(context.supabaseAdmin, playerId, packageId, paypalOrderId)) {
        return boostingLimitResponse()
      }
      return jsonResponse({ eligible: true })
    }
    if (action === 'create') {
      const server = parseServer(body.server)
      if (server === 'v2') return mergedServerResponse()
      const selectedPackageId = String(body.selectedPackageId ?? '').trim()
      const packageQuantity = Number(body.packageQuantity)
      const promoCode = String(body.promoCode ?? '').trim().toUpperCase()
      const playerId = String(body.playerId ?? '').trim()
      const username = String(body.username ?? '').trim()

      if (!server) return jsonResponse({ error: 'Please select a valid PlayCrows server.' }, 400)
      const packageDefinition = GIFT_PACKAGES_BY_SERVER[server][selectedPackageId]
      if (!packageDefinition) return jsonResponse({ error: 'Invalid support package.' }, 400)
      if (!Number.isInteger(packageQuantity) || packageQuantity < 1 || packageQuantity > MAX_PACKAGE_QUANTITY) {
        return jsonResponse({ error: 'Invalid package quantity.' }, 400)
      }
      if (!playerId || !username) return jsonResponse({ error: 'Player information is incomplete.' }, 400)
      if (playerId.length > 100 || username.length > 100) return jsonResponse({ error: 'Player information is too long.' }, 400)

      if (isV1Boosting(server, selectedPackageId)) {
        if (packageQuantity !== 1) return boostingLimitResponse('Each V1 Boosting package is limited to quantity 1 and one purchase per account.')
        if (!await checkBoostingEligibility(context.supabaseAdmin, playerId, selectedPackageId)) return boostingLimitResponse()
      }

      const amount = calculateAmount(server, packageDefinition, packageQuantity, promoCode)
      const accessToken = await getPayPalAccessToken(server)
      const requestId = `pc-create-${crypto.randomUUID()}`

      const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': requestId,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          application_context: {
            brand_name: 'PlayCrows',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
          },
          purchase_units: [
            {
              reference_id: `PLAYCROWS_${server.toUpperCase()}_SUPPORT`,
              custom_id: buildCustomId(server, playerId, username),
              description: `${packageDefinition.title} ×${packageQuantity} | PlayCrows ${server.toUpperCase()}`.slice(0, 127),
              invoice_id: `PC-${server.toUpperCase()}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
              amount: {
                currency_code: 'USD',
                value: amount.toFixed(2),
              },
            },
          ],
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.id) {
        console.error('PayPal create order error:', payload)
        return jsonResponse({ error: 'PayPal could not create the order. Please try again.' }, 502)
      }

      return jsonResponse({
        orderId: String(payload.id),
        status: String(payload.status ?? 'CREATED'),
        amount: amount.toFixed(2),
        currency: 'USD',
      })
    }

    if (action === 'capture') {
      const server = parseServer(body.server)
      if (!server) return jsonResponse({ error: 'Please select a valid PlayCrows server.' }, 400)
      const orderId = String(body.orderId ?? '').trim()
      const promoCode = String(body.promoCode ?? '').trim().toUpperCase()
      if (!/^[A-Z0-9]+$/i.test(orderId)) return jsonResponse({ error: 'Invalid PayPal order ID.' }, 400)

      // Do not capture a discounted checkout after the advertised deadline.
      // This check happens before PayPal is asked to charge the buyer.
      if (promoCode) {
        if (promoCode !== EARLY_PROMO_CODE) {
          return jsonResponse({ error: 'Invalid redeem code.' }, 400)
        }
        if (Date.now() >= EARLY_PROMO_END_TIMESTAMP) {
          return jsonResponse({ error: 'The WEEKEND10 promotion has expired. Please create a new order at the regular price.' }, 409)
        }
      }

      const accessToken = await getPayPalAccessToken(server)
      const orderResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const order = await orderResponse.json().catch(() => null)
      if (!orderResponse.ok || !order?.id || String(order.id) !== orderId) {
        return jsonResponse({ error: 'Unable to verify the PayPal order before payment.' }, 502)
      }
      const trusted = trustedPayPalPackage(order, server)
      const existingCapture = order.purchase_units[0]?.payments?.captures?.find((item: any) => item?.status === 'COMPLETED')
      if (order.status === 'COMPLETED' && existingCapture?.id) {
        return jsonResponse({ orderId, captureId: String(existingCapture.id), status: 'COMPLETED',
          amount: existingCapture.amount?.value ?? null, currency: existingCapture.amount?.currency_code ?? null })
      }
      // Already charged V2 orders remain recoverable, but never start a new charge.
      if (server === 'v2') return mergedServerResponse()
      if (isV1Boosting(server, trusted.packageId)) {
        if (trusted.quantity !== 1) return boostingLimitResponse('Each V1 Boosting package is limited to quantity 1 and one purchase per account. Please create a new order.')
        const { error } = await context.supabaseAdmin.rpc('reserve_v1_boosting_paypal', {
          p_player_id: trusted.playerId, p_package_id: trusted.packageId, p_paypal_order_id: orderId,
        })
        if (error?.message?.includes('V1_BOOSTING_LIMIT')) return boostingLimitResponse()
        if (error) return jsonResponse({ error: 'Unable to reserve this package. No payment was requested. Please contact support.' }, 503)
      }
      // The database hold precedes the charge. Keep it on ambiguous provider/network
      // failures: the same order can retry, while another order cannot double-charge.
      const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `pc-capture-${orderId}`.slice(0, 108),
          Prefer: 'return=representation',
        },
        body: '{}',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        console.error('PayPal capture order error:', payload)
        return jsonResponse({ error: 'PayPal could not confirm the payment. Please try again.' }, 502)
      }

      const capture = payload?.purchase_units?.[0]?.payments?.captures?.[0]
      if (payload?.status !== 'COMPLETED' || !capture?.id || capture?.status !== 'COMPLETED') {
        console.error('Unexpected PayPal capture response:', payload)
        return jsonResponse({ error: 'PayPal payment is not completed.' }, 409)
      }

      return jsonResponse({
        orderId,
        captureId: String(capture.id),
        status: 'COMPLETED',
        amount: capture.amount?.value ?? null,
        currency: capture.amount?.currency_code ?? null,
      })
    }

    return jsonResponse({ error: 'Invalid PayPal action.' }, 400)
  } catch (error) {
    console.error('PayPal checkout function error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'PayPal checkout failed.' },
      500
    )
  }
    }
  ),
}
