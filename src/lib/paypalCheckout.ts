import type { PlayCrowsServer } from '../server'

interface CreatePayPalOrderOptions {
  server: PlayCrowsServer
  selectedPackageId: string
  packageQuantity: number
  promoCode: string | null
  playerId: string
  username: string
}

interface CapturePayPalOrderResult {
  orderId: string
  captureId: string
  status: 'COMPLETED'
  amount: string | null
  currency: string | null
}

function requiredEnv(name: string, value?: string) {
  if (!value) throw new Error(`${name} is missing. Add it to Vercel and redeploy.`)
  return value.replace(/\/$/, '')
}

async function paypalRequest(body: Record<string, unknown>) {
  const supabaseUrl = requiredEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL)
  const publishableKey = requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

  const response = await fetch(`${supabaseUrl}/functions/v1/paypal-checkout`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `PayPal request failed with status ${response.status}.`
    throw new Error(message)
  }
  return payload
}

export async function createPayPalOrder(options: CreatePayPalOrderOptions): Promise<string> {
  const payload = await paypalRequest({ action: 'create', ...options }) as { orderId?: string }
  if (!payload.orderId) throw new Error('PayPal did not return an order ID.')
  return payload.orderId
}

export async function capturePayPalOrder(server: PlayCrowsServer, orderId: string): Promise<CapturePayPalOrderResult> {
  const payload = await paypalRequest({ action: 'capture', server, orderId }) as CapturePayPalOrderResult
  if (!payload.captureId || payload.status !== 'COMPLETED') {
    throw new Error('PayPal payment was not completed.')
  }
  return payload
}
