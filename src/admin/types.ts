export type DonationStatus = 'pending' | 'approved' | 'rejected'

export interface DonationRecord {
  id: string
  reference_code: string
  created_at: string
  player_id: string
  username: string
  currency: 'USD' | 'PHP' | 'GBP'
  amount: number | string
  selected_package_amount: number | string | null
  selected_package_id: string | null
  selected_package_title: string | null
  package_quantity: number | null
  additional_notes: string | null
  payment_method: 'paypal' | 'gcash' | 'wise' | 'bybit'
  receipt_path: string
  receipt_original_name: string | null
  receipt_mime_type: string | null
  receipt_size_bytes: number | null
  status: DonationStatus
  admin_notes: string | null
  paypal_transaction_id: string | null
  payment_verified_at: string | null
  fulfillment_status: 'not_delivered' | 'delivered'
  fulfilled_at: string | null
  fulfillment_notes: string | null
  fulfillment_evidence_path: string | null
  fulfillment_evidence_name: string | null
  fulfillment_evidence_mime_type: string | null
  fulfillment_evidence_size_bytes: number | null
  fulfilled_by: string | null
}
