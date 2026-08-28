import { withSupabase } from 'npm:@supabase/server@^1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PACKAGE_QUANTITY = 999

interface GiftPackageDefinition {
  title: string
  amount: number
}

/* Keep synchronized with src/giftPackageData.ts and submit-donation. */
const GIFT_PACKAGES: Record<string, GiftPackageDefinition> = {
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
  'august-supply-50': { title: 'AUGUST SUPPLY PACKAGE', amount: 50 },
  'august-supply-100': { title: 'AUGUST SUPPLY PACKAGE', amount: 100 },
  'august-supply-500': { title: 'AUGUST SUPPLY PACKAGE', amount: 500 },
  'august-supply-1000': { title: 'AUGUST SUPPLY PACKAGE', amount: 1000 },
}


function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function buildCustomId(playerId: string, username: string) {
  return `PC|${playerId.trim()}|${username.trim()}`.slice(0, 127)
}

function getPayPalBaseUrl() {
  return Deno.env.get('PAYPAL_ENV')?.toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

function getPayPalCredentials() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('PayPal server credentials are not configured.')
  }

  return { clientId, clientSecret }
}

async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials()
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

function calculateAmount(packageDefinition: GiftPackageDefinition, quantity: number, promoCode: string) {
  if (promoCode) {
    throw new Error('Coupon codes are not applicable to PayPal payments.')
  }

  return roundMoney(packageDefinition.amount * quantity)
}

export default {
  fetch: withSupabase(
    { auth: 'publishable' },
    async request => {
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
    if (action === 'create') {
      const selectedPackageId = String(body.selectedPackageId ?? '').trim()
      const packageQuantity = Number(body.packageQuantity)
      const promoCode = String(body.promoCode ?? '').trim().toUpperCase()
      const playerId = String(body.playerId ?? '').trim()
      const username = String(body.username ?? '').trim()

      const packageDefinition = GIFT_PACKAGES[selectedPackageId]
      if (!packageDefinition) return jsonResponse({ error: 'Invalid support package.' }, 400)
      if (!Number.isInteger(packageQuantity) || packageQuantity < 1 || packageQuantity > MAX_PACKAGE_QUANTITY) {
        return jsonResponse({ error: 'Invalid package quantity.' }, 400)
      }
      if (!playerId || !username) return jsonResponse({ error: 'Player information is incomplete.' }, 400)
      if (playerId.length > 100 || username.length > 100) return jsonResponse({ error: 'Player information is too long.' }, 400)

      const amount = calculateAmount(packageDefinition, packageQuantity, promoCode)
      const accessToken = await getPayPalAccessToken()
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
              reference_id: 'PLAYCROWS_SUPPORT',
              custom_id: buildCustomId(playerId, username),
              description: `${packageDefinition.title} ×${packageQuantity} | PlayCrows Digital Support`.slice(0, 127),
              invoice_id: `PC-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
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
      const orderId = String(body.orderId ?? '').trim()
      if (!/^[A-Z0-9]+$/i.test(orderId)) return jsonResponse({ error: 'Invalid PayPal order ID.' }, 400)

      const accessToken = await getPayPalAccessToken()
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
