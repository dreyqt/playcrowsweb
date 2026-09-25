import type { Currency, FormData } from './types'
import type { PlayCrowsServer } from './server'
import { CURRENCY_META } from './constants'

/** Weekend 10% coupon for both V1 and V2 Web Shops. */
export const EARLY_PROMO_CODE = 'WEEKEND10'
export const EARLY_PROMO_DISCOUNT_PERCENT = 10

/*
 * Valid throughout Sunday, September 27, 2026 in Singapore / GMT+8.
 * The exclusive cutoff is Monday, September 28 at midnight (16:00 UTC).
 * Keep synchronized with the PayPal checkout, submission and recovery functions.
 */
export const EARLY_PROMO_END_ISO = '2026-09-27T16:00:00.000Z'

/** Human-readable last valid minute, derived from the exclusive promo cutoff. */
export const EARLY_PROMO_END_DISPLAY = formatExclusiveEndForSingapore(EARLY_PROMO_END_ISO)

function formatExclusiveEndForSingapore(exclusiveEndIso: string) {
  const lastValidInstant = new Date(new Date(exclusiveEndIso).getTime() - 1)
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(lastValidInstant)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(lastValidInstant)

  return `${date} · ${time} GMT+8 Singapore Time`
}

export interface PromoApplyResult {
  success: boolean
  message: string
}

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase()
}

export function isEarlyPromoActive(server: PlayCrowsServer, now = new Date()) {
  return (server === 'v1' || server === 'v2') && now.getTime() < new Date(EARLY_PROMO_END_ISO).getTime()
}

export function isPackageEligibleForPromo(
  server: PlayCrowsServer,
  data: FormData,
  selectedPackageAmount: number | null
) {
  if ((server !== 'v1' && server !== 'v2') || selectedPackageAmount === null) {
    return false
  }

  return Number(data.amount) === selectedPackageAmount * Number(data.packageQuantity)
}

export function getPackageAmountInCurrency(
  packageAmountUsd: number,
  currency: Currency,
  quantity = 1
) {
  const rate = CURRENCY_META[currency]?.rateFromUSD ?? 1
  return roundMoney(packageAmountUsd * quantity * rate)
}

export function getDiscountedPackageAmount(
  packageAmountUsd: number,
  currency: Currency,
  quantity = 1
) {
  const originalAmount = getPackageAmountInCurrency(
    packageAmountUsd,
    currency,
    quantity
  )

  return roundMoney(
    originalAmount *
      (1 - EARLY_PROMO_DISCOUNT_PERCENT / 100)
  )
}

export function formatCurrencyAmount(
  currency: Currency,
  amount: number
) {
  const meta = CURRENCY_META[currency]

  return `${meta.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}
