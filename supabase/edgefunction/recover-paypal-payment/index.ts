import { createClient } from 'npm:@supabase/supabase-js@^2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GiftPackageDefinition { title: string; amount: number }

const V1_GIFT_PACKAGES: Record<string, GiftPackageDefinition> = {
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
  'september-supply-50': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 50 },
  'september-supply-100': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 100 },
  'september-supply-500': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 500 },
  'september-supply-1000': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 1000 },
}

const V2_GIFT_PACKAGES: Record<string, GiftPackageDefinition> = { ...V1_GIFT_PACKAGES }
const GIFT_PACKAGES_BY_SERVER = { v1: V1_GIFT_PACKAGES, v2: V2_GIFT_PACKAGES } as const
type PlayCrowsServer = keyof typeof GIFT_PACKAGES_BY_SERVER

function jsonResponse(body: unknown, status = 200) { return Response.json(body, { status, headers: CORS_HEADERS }) }
function getPayPalBaseUrl() { return Deno.env.get('PAYPAL_ENV')?.toLowerCase() === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com' }
function getPayPalCredentials(server: PlayCrowsServer) {
  const suffix = server.toUpperCase()
  const clientId = Deno.env.get(`PAYPAL_CLIENT_ID_${suffix}`) || Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get(`PAYPAL_CLIENT_SECRET_${suffix}`) || Deno.env.get('PAYPAL_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('PayPal server credentials are not configured.')
  return { clientId, clientSecret }
}
async function getPayPalAccessToken(server: PlayCrowsServer) {
  const { clientId, clientSecret } = getPayPalCredentials(server)
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST', headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) throw new Error('Unable to authenticate with PayPal.')
  return String(payload.access_token)
}
async function paypalGet(server: PlayCrowsServer, path: string) {
  const token = await getPayPalAccessToken(server)
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const payload = await response.json().catch(() => null)
  return { response, payload }
}
function parseCustomId(customId: unknown): { server: PlayCrowsServer; playerId: string; username: string } | null {
  if (typeof customId !== 'string') return null
  const parts = customId.split('|')
  if (parts.length < 4 || parts[0] !== 'PC') return null

  // Current layout: PC|PLAYER_ID|V1|CHARACTER
  const currentServer = parts[2]?.toLowerCase()
  if (currentServer === 'v1' || currentServer === 'v2') {
    const playerId = parts[1]?.trim()
    const username = parts.slice(3).join('|').trim()
    if (!playerId || !username) return null
    return { server: currentServer, playerId, username }
  }

  // Backward compatibility for payments created before the webhook-field fix:
  // PC|V1|PLAYER_ID|CHARACTER
  const legacyServer = parts[1]?.toLowerCase()
  if (legacyServer === 'v1' || legacyServer === 'v2') {
    const playerId = parts[2]?.trim()
    const username = parts.slice(3).join('|').trim()
    if (!playerId || !username) return null
    return { server: legacyServer, playerId, username }
  }

  return null
}
function parseDescription(description: unknown) {
  if (typeof description !== 'string') return null
  const match = description.match(/^(.*?)\s+×(\d+)\s+\|\s+PlayCrows\s+(V1|V2)$/i)
  if (!match) return null
  return { title: match[1].trim(), quantity: Number(match[2]), server: match[3].toLowerCase() as PlayCrowsServer }
}
function inferPackage(server: PlayCrowsServer, title: string, quantity: number, totalPaid: number) {
  if (!Number.isInteger(quantity) || quantity < 1) return null
  const unitPaid = Math.round((totalPaid / quantity) * 100) / 100
  const matches = Object.entries(GIFT_PACKAGES_BY_SERVER[server]).filter(([, item]) => item.title.toLowerCase() === title.toLowerCase() && Math.abs(item.amount - unitPaid) < 0.001)
  return matches.length === 1 ? { id: matches[0][0], ...matches[0][1] } : null
}
async function resolveOrder(inputId: string, server: PlayCrowsServer) {
  const orderAttempt = await paypalGet(server, `/v2/checkout/orders/${encodeURIComponent(inputId)}`)
  if (orderAttempt.response.ok && orderAttempt.payload?.id) return orderAttempt.payload
  const captureAttempt = await paypalGet(server, `/v2/payments/captures/${encodeURIComponent(inputId)}`)
  if (!captureAttempt.response.ok || !captureAttempt.payload?.id) return null
  const orderId = captureAttempt.payload?.supplementary_data?.related_ids?.order_id
  if (!orderId) return null
  const order = await paypalGet(server, `/v2/checkout/orders/${encodeURIComponent(String(orderId))}`)
  return order.response.ok ? order.payload : null
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Supabase environment is not configured.' }, 500)
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized.' }, 401)
    const accessToken = authorization.slice(7).trim()
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken)
    if (userError || !user) return jsonResponse({ error: 'Unauthorized.' }, 401)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: adminUser } = await adminClient.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminUser) return jsonResponse({ error: 'Administrator access required.' }, 403)
    let body: Record<string, unknown>
    try { body = await request.json() } catch { return jsonResponse({ error: 'Invalid JSON request.' }, 400) }
    const inputId = String(body.paypalId ?? '').trim().toUpperCase()
    const requestedServer = String(body.server ?? '').trim().toLowerCase()
    if (!/^[A-Z0-9]+$/.test(inputId)) return jsonResponse({ error: 'Enter a valid PayPal Order or Capture ID.' }, 400)
    if (requestedServer !== 'v1' && requestedServer !== 'v2') return jsonResponse({ error: 'Select the server used for this PayPal payment.' }, 400)
    const server = requestedServer as PlayCrowsServer
    try {
      const order = await resolveOrder(inputId, server)
      if (!order?.id) return jsonResponse({ error: 'PayPal could not find that Order/Capture ID for the selected server account.' }, 404)
      if (order.status !== 'COMPLETED') return jsonResponse({ error: `PayPal order is ${String(order.status ?? 'not completed')}. Only completed payments can be recovered.` }, 409)
      const unit = order.purchase_units?.[0]
      const captures = Array.isArray(unit?.payments?.captures) ? unit.payments.captures : []
      const capture = captures.find((item: any) => item?.status === 'COMPLETED')
      if (!capture?.id) return jsonResponse({ error: 'No completed PayPal capture was found on this order.' }, 409)
      const custom = parseCustomId(unit?.custom_id); const description = parseDescription(unit?.description)
      if (!custom || !description) return jsonResponse({ error: 'This PayPal payment does not contain enough PlayCrows checkout metadata to recover automatically.' }, 422)
      if (custom.server !== server || description.server !== server) return jsonResponse({ error: `This payment belongs to PlayCrows ${custom.server.toUpperCase()}, not ${server.toUpperCase()}.` }, 409)
      const currency = String(capture.amount?.currency_code ?? ''); const totalPaid = Number(capture.amount?.value)
      if (currency !== 'USD' || !Number.isFinite(totalPaid) || totalPaid <= 0) return jsonResponse({ error: 'The PayPal capture amount/currency could not be verified.' }, 422)
      const recoveredPackage = inferPackage(server, description.title, description.quantity, totalPaid)
      if (!recoveredPackage) return jsonResponse({ error: `The paid amount (${currency} ${totalPaid.toFixed(2)}) and PayPal description (${description.title} ×${description.quantity}) do not map uniquely to the current package catalog.` }, 422)
      const { data: existing } = await adminClient.from('donations').select('id, reference_code').or(`paypal_order_id.eq.${order.id},paypal_capture_id.eq.${capture.id},paypal_transaction_id.eq.${capture.id}`).limit(1).maybeSingle()
      if (existing) return jsonResponse({ error: `This PayPal payment is already recorded as ${existing.reference_code}.`, duplicate: true, donationId: existing.id, referenceCode: existing.reference_code }, 409)
      const verifiedAt = capture.update_time || capture.create_time || new Date().toISOString()
      const payerEmail = typeof order.payer?.email_address === 'string' ? order.payer.email_address : null
      const { data: donation, error: insertError } = await adminClient.from('donations').insert({
        server, player_id: custom.playerId, username: custom.username, currency: 'USD', amount: totalPaid,
        selected_package_amount: recoveredPackage.amount, selected_package_id: recoveredPackage.id, selected_package_title: recoveredPackage.title,
        package_quantity: description.quantity, additional_notes: 'Recovered from a completed PayPal checkout after the customer closed the Donation Center before final submission.',
        payment_method: 'paypal', paypal_order_id: String(order.id), paypal_capture_id: String(capture.id), paypal_payment_status: 'COMPLETED',
        paypal_payer_email: payerEmail, paypal_transaction_id: String(capture.id), payment_verified_at: verifiedAt, promo_code: null, discount_percent: 0,
        status: 'pending', admin_notes: `Recovered from PayPal by ${user.email ?? user.id}. Original PayPal ID entered: ${inputId}.`,
      }).select('id, reference_code, created_at, server, player_id, username, selected_package_id, selected_package_title, package_quantity, amount, currency, paypal_order_id, paypal_capture_id, payment_verified_at, event_bonus_name, event_bonus_eligible').single()
      if (insertError || !donation) {
        console.error('Recovered PayPal donation insert error:', insertError)
        if (insertError?.code === '23505') return jsonResponse({ error: 'This PayPal payment has already been recorded.' }, 409)
        return jsonResponse({ error: 'PayPal was verified, but the recovered donation record could not be created.' }, 500)
      }
      return jsonResponse({ success: true, message: `Recovered ${donation.reference_code} from PayPal.`, donation })
    } catch (error) {
      console.error('Recover PayPal payment error:', error)
      return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to recover PayPal payment.' }, 500)
    }
  },
}
