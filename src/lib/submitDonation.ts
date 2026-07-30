import type { FormData } from '../types'

export interface DonationResponse {
  success: true
  message: string
  donation: {
    id: string
    referenceCode: string
    createdAt: string
    status: 'pending' | 'approved' | 'rejected'
  }
}

interface SubmitDonationOptions {
  data: FormData
  selectedPackageAmount: number | null
}

function getRequiredEnvironmentVariable(name: string, value?: string) {
  if (!value) {
    throw new Error(
      `${name} is missing. Add it to your Vercel environment variables and redeploy.`
    )
  }

  return value.replace(/\/$/, '')
}

export async function submitDonation({
  data,
  selectedPackageAmount,
}: SubmitDonationOptions): Promise<DonationResponse> {
  if (!data.receiptFile) {
    throw new Error('Please upload your payment receipt before submitting.')
  }

  if (!data.paymentMethod) {
    throw new Error('Please select a payment method before submitting.')
  }

  const amount =
    data.amount === 'custom'
      ? data.customAmount.trim()
      : data.amount.trim()

  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error('The selected support amount is invalid.')
  }

  const supabaseUrl = getRequiredEnvironmentVariable(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL
  )

  const publishableKey = getRequiredEnvironmentVariable(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )

  const body = new FormData()
  body.append('playerId', data.playerId.trim())
  body.append('username', data.username.trim())
  body.append('currency', data.currency)
  body.append('amount', amount)
  body.append('paymentMethod', data.paymentMethod)
  body.append('receipt', data.receiptFile)
  body.append('website', '')

  if (selectedPackageAmount !== null) {
    body.append('selectedPackageAmount', String(selectedPackageAmount))
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/submit-donation`,
    {
      method: 'POST',
      headers: {
        apikey: publishableKey,
      },
      body,
    }
  )

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Submission failed with status ${response.status}.`

    throw new Error(message)
  }

  return payload as DonationResponse
}
