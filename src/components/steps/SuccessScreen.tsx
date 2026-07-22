import { Btn, Card } from '../ui'
import { CheckIcon } from '../icons'

export function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e]">
        <CheckIcon size={36} />
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-[#e8eaf0]">Payment Receipt Submitted Successfully!</h2>
        <p className="text-sm text-[#f5a623] font-semibold">Thank you for supporting Playcrows by Hawk!</p>
        <p className="text-sm text-[#6b7280] leading-relaxed max-w-md">
          Your payment is now waiting for verification. Once your payment has been confirmed, your support contribution will be processed accordingly.
        </p>
      </div>
      <Card className="w-full max-w-sm p-5">
        <p className="text-xs text-[#6b7280] leading-relaxed flex items-start gap-2">
          <span className="text-[#f5a623] text-base leading-none mt-0.5">⚠</span>
          Please keep your payment receipt until your transaction has been successfully verified.
        </p>
      </Card>
      <Btn variant="secondary" onClick={onReset}>Make Another Transaction</Btn>
    </div>
  )
}
