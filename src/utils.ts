import { CURRENCY_META } from './constants'
import type { Currency, FormData } from './types'

export function convertAmount(usdValue: string, currency: Currency): string {
  const n = parseFloat(usdValue)
  if (isNaN(n)) return ''

  const rate = CURRENCY_META[currency].rateFromUSD
  const converted = n * rate

  if (currency === 'PHP') return converted.toLocaleString('en-PH', { maximumFractionDigits: 0 })
  if (currency === 'GBP') return converted.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function displayAmount(form: FormData): string {
  const currency = form.currency ?? 'USD'
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD
  const raw = form.amount === 'custom' ? form.customAmount : form.amount
  if (!raw) return ''

  return `${meta.symbol}${convertAmount(raw, currency)}`
}
