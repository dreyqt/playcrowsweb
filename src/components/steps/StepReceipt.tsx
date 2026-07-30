import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { FormData } from '../../types'
import { Btn, Card } from '../ui'
import { UploadIcon } from '../icons'

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const clearCurrentPreview = () => {
    if (data.receiptPreview) {
      URL.revokeObjectURL(data.receiptPreview)
    }
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Only JPG, PNG, WEBP, and PDF receipts are allowed.')
      event.target.value = ''
      return
    }

    if (file.size <= 0 || file.size > MAX_RECEIPT_SIZE) {
      setError('The receipt must be larger than 0 bytes and no more than 5 MB.')
      event.target.value = ''
      return
    }

    clearCurrentPreview()

    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null

    onUpdate({
      receiptFile: file,
      receiptPreview: preview,
    })

    setError('')
  }

  const removeReceipt = () => {
    clearCurrentPreview()

    onUpdate({
      receiptFile: null,
      receiptPreview: null,
    })

    if (inputRef.current) {
      inputRef.current.value = ''
    }

    setError('')
  }

  const continueToReview = () => {
    if (!data.receiptFile) {
      setError('Please upload your payment receipt before continuing.')
      return
    }

    setError('')
    onNext()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">
          Upload Payment Receipt
        </h2>

        <p className="text-sm leading-6 text-[#6b7280]">
          Upload a clear screenshot or PDF showing the completed payment. Your
          receipt will be stored privately and reviewed by the PlayCrows team.
        </p>
      </div>

      <Card className="p-6">
        {!data.receiptFile ? (
          <label
            htmlFor="payment-receipt"
            className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#353c52] bg-[#10131a] px-6 py-8 text-center transition-colors hover:border-[#66d4ff]/70 hover:bg-[#66d4ff]/5"
          >
            <UploadIcon />

            <div className="mt-4 text-sm font-bold text-[#e8eaf0]">
              Select your payment receipt
            </div>

            <p className="mt-2 max-w-sm text-xs leading-5 text-[#6b7280]">
              Accepted formats: JPG, PNG, WEBP, or PDF. Maximum file size: 5 MB.
            </p>

            <span className="mt-5 rounded-lg border border-[#66d4ff]/50 bg-[#66d4ff]/10 px-4 py-2 text-xs font-bold text-[#66d4ff]">
              Choose File
            </span>
          </label>
        ) : (
          <div className="flex flex-col gap-5">
            {data.receiptPreview ? (
              <div className="overflow-hidden rounded-xl border border-[#252a38] bg-[#0d0f14]">
                <img
                  src={data.receiptPreview}
                  alt="Payment receipt preview"
                  className="max-h-[460px] w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-[#252a38] bg-[#0d0f14] px-6 text-center">
                <div>
                  <div className="text-3xl" aria-hidden="true">📄</div>
                  <div className="mt-2 text-sm font-bold text-[#e8eaf0]">
                    PDF receipt selected
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-[#252a38] bg-[#13161e] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#e8eaf0]">
                  {data.receiptFile.name}
                </div>

                <div className="mt-1 text-xs text-[#6b7280]">
                  {formatFileSize(data.receiptFile.size)} · {data.receiptFile.type}
                </div>
              </div>

              <button
                type="button"
                onClick={removeReceipt}
                className="min-h-9 flex-shrink-0 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 px-3 py-2 text-xs font-bold text-[#ef4444] transition-colors hover:bg-[#ef4444]/10"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          id="payment-receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFile}
        />
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef4444]"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#66d4ff]/25 bg-[#66d4ff]/5 px-4 py-3 text-xs leading-5 text-[#9aa6ba]">
        Make sure the amount, recipient, transaction date, and transaction ID
        are visible whenever your payment provider shows them.
      </div>

      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>
          Back
        </Btn>

        <Btn onClick={continueToReview} disabled={!data.receiptFile}>
          Continue to Review
        </Btn>
      </div>
    </div>
  )
}
