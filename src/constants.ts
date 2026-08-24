import type { Currency, PaymentMethod } from './types'

export const PRESET_AMOUNTS_USD = ['5', '10', '50', '100', '200', '500', '1000'] as const

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; rateFromUSD: number }> = {
  USD: { symbol: '$', label: 'USD', rateFromUSD: 1 },
  PHP: { symbol: '₱', label: 'PHP', rateFromUSD: 60 },
  GBP: { symbol: '£', label: 'GBP', rateFromUSD: 0.79 },
}

export const PAYMENT_INFO = {
  gcash: { name: 'PLAYCROWS', number: '+63 9XX XXX 9607' },
  wise: { accountName: 'Playcrows', wisetag: '@darrendagusmaranad', link: 'https://wise.com/pay/me/darrendagusmaranad', },
  bybit: { uid: '164220077', asset: 'USDT', network: 'TRC20', address: 'TUXBG7N86yabdJUwoJmtGkTq39DkphU8HN', },
} as const

export const STEPS = ['Amount', 'Player Info', 'Payment', 'Receipt', 'Complete'] as const

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: 'paddle', label: 'Card & Local Payments', desc: 'Secure checkout by Paddle with cards and supported local payment methods' },
  { id: 'gcash', label: 'GCash', desc: 'Pay using GCash' },
  { id: 'wise', label: 'Wise', desc: 'Pay using Wise QR or Wisetag' },
  { id: 'bybit', label: 'ByBit', desc: 'Internal transfer or USDT transfer through TRC20' },
]
