import type { Currency, FormData } from './types'
import type { PlayCrowsServer } from './server'
import { CURRENCY_META } from './constants'

/** Weekend 10% coupon for both V1 and V2 Web Shops. */
export const EARLY_PROMO_CODE = 'WEEKEND10'
export const EARLY_PROMO_DISCOUNT_PERCENT = 10

/*
 * Sunday, September 27, 2026 at 11:59:59 PM Singapore / GMT+8.
 * new UTC equivalent: September 27, 2026 at 15:59:59.999.
 */
export const EARLY_PROMO_END_ISO = '2026-09-27T15:59:59.999Z'

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
