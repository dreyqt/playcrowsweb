import type { FormData } from '../../types'
import { displayAmount } from '../../utils'
import { CURRENCY_META, PAYMENT_METHODS } from '../../constants'
import { Btn, Card, SummaryRow } from '../ui'
import { CheckIcon } from '../icons'

export function StepComplete({
  data,
  onSubmit,
  onBack,
}: {
  data: FormData
  onSubmit: () => void
  onBack: () => void
}) {
  const methodLabel = PAYMENT_METHODS.find(m => m.id === data.paymentMethod)?.label ?? ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">Payment Summary</h2>
        <p className="text-sm text-[#6b7280]">Review your information before submitting.</p>
      </div>
      <Card className="p-5">
        <SummaryRow label="Player ID" value={data.playerId} />
        <SummaryRow label="Username" value={data.username} />
        <SummaryRow label="Payment Method" value={methodLabel} />
        <SummaryRow label="Amount" value={displayAmount(data)} />
        <SummaryRow label="Currency" value={CURRENCY_META[data.currency].label} />
        <div className="flex items-center justify-between py-3">
          <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest">Receipt</span>
          <span className="text-sm font-medium text-[#22c55e] flex items-center gap-1.5">
            <CheckIcon size={12} /> Uploaded
          </span>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>Back</Btn>
        <Btn onClick={onSubmit}>Submit Payment Receipt</Btn>
      </div>
    </div>
  )
}
