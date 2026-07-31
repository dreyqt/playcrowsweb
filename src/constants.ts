import type { Currency, PaymentMethod } from './types'

export const PRESET_AMOUNTS_USD = ['10', '50', '100', '200', '500', '1000'] as const

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; rateFromUSD: number }> = {
  USD: { symbol: '$', label: 'USD', rateFromUSD: 1 },
  PHP: { symbol: '₱', label: 'PHP', rateFromUSD: 60 },
  GBP: { symbol: '£', label: 'GBP', rateFromUSD: 0.79 },
}

export const PAYMENT_INFO = {
  gcash: { name: 'PLAYCROWS', number: '+63 9XX XXX 9607' },
  paypal: { email: 'PlayCrows', link: 'paypal.me/andreybitoon' },
  wise: { accountName: 'Playcrows', email: '@playcrows' },
  bybit: { uid: '164220077', asset: 'USDT', network: 'TRC20', address: 'TUXBG7N86yabdJUwoJmtGkTq39DkphU8HN', },
} as const

export const STEPS = ['Amount', 'Player Info', 'Payment', 'Receipt', 'Complete'] as const

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: 'paypal', label: 'PayPal', desc: 'Pay securely using PayPal' },
  { id: 'gcash', label: 'GCash', desc: 'Pay using GCash' },
  { id: 'wise', label: 'Wise', desc: 'Send your payment using Wise' },
  { id: 'bybit', label: 'ByBit', desc: 'Internal transfer or USDT transfer through TRC20' },
]
