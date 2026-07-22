import { useCallback, useRef, useState } from 'react'
import type { FormData } from '../../types'
import { Btn, Card } from '../ui'
import { UploadIcon, CheckIcon, DiscordIcon, TicketIcon } from '../icons'

export function StepReceipt({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => onUpdate({ receiptFile: file, receiptPreview: e.target?.result as string })
    reader.readAsDataURL(file)
  }, [onUpdate])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">Submit Your Payment Receipt</h2>
        <p className="text-sm text-[#6b7280] leading-relaxed">
          Once you have completed your payment, upload your receipt below so we can verify your transaction.
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200
          ${dragging ? 'border-[#f5a623] bg-[#f5a623]/5' : 'border-[#252a38] hover:border-[#353c52] hover:bg-[#191d27]'}
          ${data.receiptPreview ? 'border-[#22c55e]/50 bg-[#22c55e]/5' : ''}
        `}
      >
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="hidden" />
        {data.receiptPreview ? (
          <div className="flex flex-col items-center gap-3">
            {data.receiptFile?.type === 'application/pdf' ? (
              <div className="w-20 h-24 bg-[#252a38] rounded-xl flex items-center justify-center text-3xl">📄</div>
            ) : (
              <img src={data.receiptPreview} alt="Receipt preview" className="max-h-48 rounded-xl object-contain border border-[#252a38]" />
            )}
            <div className="flex items-center gap-2 text-[#22c55e] text-sm font-semibold">
              <CheckIcon size={14} /> {data.receiptFile?.name}
            </div>
            <span className="text-xs text-[#6b7280]">Click to replace</span>
          </div>
        ) : (
          <>
            <UploadIcon />
            <div className="text-center">
              <div className="text-sm font-semibold text-[#e8eaf0]">Drag and drop your receipt here</div>
              <div className="text-xs text-[#6b7280] mt-1">or</div>
              <div className="mt-2 text-sm font-semibold text-[#f5a623]">Browse Files</div>
            </div>
            <div className="text-xs text-[#6b7280]">JPG, PNG, JPEG, PDF accepted</div>
          </>
        )}
      </div>

      <p className="text-xs text-[#6b7280] leading-relaxed">
        Make sure your receipt clearly shows the payment amount and transaction details.
      </p>

      <Card className="p-5 flex flex-col gap-4">
        <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest">Can't upload? Contact us directly</div>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          If you are unable to upload your receipt here, you can contact Hawk or NightFall directly on Discord, or create a support ticket and send your receipt there.
        </p>
        <div className="bg-[#13161e] rounded-xl p-4 text-xs text-[#6b7280] leading-relaxed">
          When contacting, please include: <span className="text-[#e8eaf0]">Player ID · Username · Payment Method · Donation Amount · Receipt</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn variant="secondary" className="flex-1 min-w-[140px]"onClick={() => window.open("https://discord.com/channels/1527607490840100955/1527608168711061614", "_blank")}><DiscordIcon /> Contact Customer Support</Btn>
          <Btn variant="ghost" className="flex-1 min-w-[140px]"onClick={() => window.open("https://discord.com/channels/1527607490840100955/1527609980625227866", "_blank")}><TicketIcon /> Create a Ticket</Btn>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>Back</Btn>
        <Btn onClick={onNext} disabled={!data.receiptFile}>Continue to Summary</Btn>
      </div>
    </div>
  )
}
