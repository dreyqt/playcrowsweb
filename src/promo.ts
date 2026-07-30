import type { Currency, FormData } from './types'
import { CURRENCY_META } from './constants'

export const EARLY_PROMO_CODE = 'EARLY10'
export const EARLY_PROMO_DISCOUNT_PERCENT = 10

/*
 * July 31, 2026 at 3:00 PM Singapore Time (UTC+8).
 * The matching UTC time is 7:00 AM.
 */
export const EARLY_PROMO_END_ISO = '2026-07-31T07:00:00.000Z'

export interface PromoApplyResult {
  success: boolean
  message: string
}

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase()
}

export function isEarlyPromoActive(now = new Date()) {
  return now.getTime() < new Date(EARLY_PROMO_END_ISO).getTime()
}

export function isPackageEligibleForPromo(
  data: FormData,
  selectedPackageAmount: number | null
) {
  if (selectedPackageAmount === null || data.amount === 'custom') {
    return false
  }

  return Number(data.amount) === selectedPackageAmount
}

export function getPackageAmountInCurrency(
  packageAmountUsd: number,
  currency: Currency
) {
  const rate = CURRENCY_META[currency]?.rateFromUSD ?? 1
  return roundMoney(packageAmountUsd * rate)
}

export function getDiscountedPackageAmount(
  packageAmountUsd: number,
  currency: Currency
) {
  const originalAmount = getPackageAmountInCurrency(
    packageAmountUsd,
    currency
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
