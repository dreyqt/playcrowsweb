import type { FormData } from '../../types'
import { displayAmount } from '../../utils'
import { Btn, Card } from '../ui'

const PAYMENT_LABELS = {
  paypal: 'PayPal',
  gcash: 'GCash',
  wise: 'Wise',
  bybit: 'Bybit',
} as const

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#252a38] px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-[#6b7280]">{label}</span>
      <span className="break-all text-sm font-medium text-[#e8eaf0]">
        {value}
      </span>
    </div>
  )
}

export function StepComplete({
  data,
  selectedPackageAmount,
  onSubmit,
  onBack,
  isSubmitting,
  submitError,
}: {
  data: FormData
  selectedPackageAmount: number | null
  onSubmit: () => Promise<void> | void
  onBack: () => void
  isSubmitting: boolean
  submitError: string
}) {
  const paymentLabel = data.paymentMethod
    ? PAYMENT_LABELS[data.paymentMethod]
    : 'Not selected'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">
          Review Your Submission
        </h2>

        <p className="text-sm leading-6 text-[#6b7280]">
          Confirm the information below before sending your donation form for
          review.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[#252a38] px-5 py-4">
          <div className="text-sm font-bold text-[#e8eaf0]">
            Donation Details
          </div>
        </div>

        <SummaryRow label="Player ID" value={data.playerId} />
        <SummaryRow label="Username" value={data.username} />
        <SummaryRow label="Support Amount" value={displayAmount(data)} />
        <SummaryRow
          label="Initial Gift Package"
          value={
            selectedPackageAmount === null
              ? 'Not selected'
              : `$${selectedPackageAmount.toLocaleString()}`
          }
        />
        <SummaryRow label="Payment Method" value={paymentLabel} />
        <SummaryRow
          label="Payment Receipt"
          value={data.receiptFile?.name ?? 'Not uploaded'}
        />
      </Card>

      <div className="rounded-xl border border-[#66d4ff]/25 bg-[#66d4ff]/5 px-4 py-4">
        <div className="text-sm font-bold text-[#66d4ff]">
          What happens next?
        </div>

        <p className="mt-2 text-xs leading-5 text-[#a8b2c5]">
          Your submission will be marked as pending while the PlayCrows team
          checks the payment and receipt. Keep the reference code shown after
          submission.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef4444]"
        >
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <Btn variant="ghost" onClick={onBack} disabled={isSubmitting}>
          Back
        </Btn>

        <Btn
          onClick={() => void onSubmit()}
          disabled={isSubmitting || !data.receiptFile || !data.paymentMethod}
        >
          {isSubmitting ? 'Submitting…' : 'Submit Donation Form'}
        </Btn>
      </div>
    </div>
  )
}
