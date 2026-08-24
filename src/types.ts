export type PaymentMethod = 'paddle' | 'gcash' | 'wise' | 'bybit'
export type Currency = 'USD' | 'PHP' | 'GBP'

export interface FormData {
  currency: Currency
  amount: string
  packageQuantity: string
  playerId: string
  username: string
  paymentMethod: PaymentMethod | null
  receiptFile: File | null
  receiptPreview: string | null
  additionalNotes: string
  paddleCheckoutId: string | null
  paddleTransactionId: string | null
  paddlePaymentStatus: 'COMPLETED' | null
}
