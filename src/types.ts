export type PaymentMethod = 'paypal' | 'gcash' | 'wise' | 'bybit'
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
  paypalOrderId: string | null
  paypalCaptureId: string | null
  paypalPaymentStatus: 'COMPLETED' | null
}
