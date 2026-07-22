export type PaymentMethod = 'gcash' | 'paypal' | 'wise'
export type Currency = 'USD' | 'PHP' | 'GBP'

export interface FormData {
  currency: Currency
  amount: string
  customAmount: string
  playerId: string
  username: string
  paymentMethod: PaymentMethod | null
  receiptFile: File | null
  receiptPreview: string | null
