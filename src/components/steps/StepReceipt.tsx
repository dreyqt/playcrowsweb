import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { FormData } from '../../types'
import { useI18n } from '../../i18n'
import { Btn, Card } from '../ui'
import { UploadIcon } from '../icons'

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function StepReceipt({ data, onUpdate, onNext, onBack }: {
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const clearCurrentPreview = () => {
    if (data.receiptPreview) URL.revokeObjectURL(data.receiptPreview)
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.has(file.type)) {
      setError(t('invalidReceiptType'))
      event.target.value = ''
      return
    }

    if (file.size <= 0 || file.size > MAX_RECEIPT_SIZE) {
      setError(t('invalidReceiptSize'))
      event.target.value = ''
      return
    }

    clearCurrentPreview()
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    onUpdate({ receiptFile: file, receiptPreview: preview })
    setError('')
  }

  const removeReceipt = () => {
    clearCurrentPreview()
    onUpdate({ receiptFile: null, receiptPreview: null })
    if (inputRef.current) inputRef.current.value = ''
    setError('')
  }

  const continueToReview = () => {
    if (!data.receiptFile) {
      setError(t('receiptRequired'))
      return
    }
    setError('')
    onNext()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#eee9df]">{t('uploadReceipt')}</h2>
        <p className="text-sm leading-6 text-[#77746e]">{t('uploadReceiptDesc')}</p>
      </div>

      <Card className="p-6">
        {!data.receiptFile ? (
          <label htmlFor="payment-receipt" className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#3b414b] bg-[#0e1014] px-6 py-8 text-center transition-colors hover:border-[#c9aa68]/70 hover:bg-[#c9aa68]/5">
            <UploadIcon />
            <div className="mt-4 text-sm font-bold text-[#eee9df]">{t('selectReceipt')}</div>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[#77746e]">{t('acceptedFormats')}</p>
            <span className="mt-5 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 py-2 text-xs font-bold text-[#c9aa68]">{t('chooseFile')}</span>
          </label>
        ) : (
          <div className="flex flex-col gap-5">
            {data.receiptPreview ? (
              <div className="overflow-hidden rounded-xl border border-[#292d34] bg-[#0a0b0d]">
                <img src={data.receiptPreview} alt={t('receiptPreview')} className="max-h-[460px] w-full object-contain" />
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-[#292d34] bg-[#0a0b0d] px-6 text-center">
                <div><div className="text-3xl" aria-hidden="true">📄</div><div className="mt-2 text-sm font-bold text-[#eee9df]">{t('pdfSelected')}</div></div>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-[#292d34] bg-[#111318] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#eee9df]">{data.receiptFile.name}</div><div className="mt-1 text-xs text-[#77746e]">{formatFileSize(data.receiptFile.size)} · {data.receiptFile.type}</div></div>
              <button type="button" onClick={removeReceipt} className="min-h-9 flex-shrink-0 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 px-3 py-2 text-xs font-bold text-[#ef4444] transition-colors hover:bg-[#ef4444]/10">{t('remove')}</button>
            </div>
          </div>
        )}
        <input ref={inputRef} id="payment-receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} />
      </Card>

      <Card className="p-5">
        <label htmlFor="additional-notes" className="block text-sm font-bold text-[#eee9df]">{t('additionalNotes')}</label>
        <p className="mt-1 text-xs leading-5 text-[#77746e]">{t('additionalNotesDesc')}</p>
        <textarea id="additional-notes" rows={4} maxLength={1000} value={data.additionalNotes} onChange={event => onUpdate({ additionalNotes: event.target.value })} placeholder={t('additionalNotesPlaceholder')} className="mt-3 w-full resize-y rounded-xl border border-[#3b414b] bg-[#0d0f13] px-3 py-3 text-sm text-[#eee9df] outline-none transition focus:border-[#c9aa68]" />
        <div className="mt-1 text-right text-[10px] text-[#77746e]">{data.additionalNotes.length}/1000</div>
      </Card>

      {error && <div role="alert" className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef4444]">{error}</div>}
      <div className="rounded-xl border border-[#c9aa68]/25 bg-[#c9aa68]/5 px-4 py-3 text-xs leading-5 text-[#aaa49a]">{t('receiptVisibility')}</div>
      <div className="flex items-center justify-between"><Btn variant="ghost" onClick={onBack}>{t('back')}</Btn><Btn onClick={continueToReview} disabled={!data.receiptFile}>{t('continueReview')}</Btn></div>
    </div>
  )
}
