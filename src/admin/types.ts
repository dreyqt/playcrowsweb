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
}
