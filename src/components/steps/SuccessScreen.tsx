import { useI18n } from '../../i18n'
import { Btn, Card } from '../ui'
import { CheckIcon } from '../icons'

export function SuccessScreen({ onReset }: { onReset: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e]"><CheckIcon size={36} /></div>
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-[#eee9df]">{t('receiptSuccess')}</h2>
        <p className="text-sm text-[#d3ad62] font-semibold">{t('thankSupport')}</p>
        <p className="text-sm text-[#77746e] leading-relaxed max-w-md">{t('receiptSuccessDesc')}</p>
      </div>
      <Card className="w-full max-w-sm p-5"><p className="text-xs text-[#77746e] leading-relaxed flex items-start gap-2"><span className="text-[#d3ad62] text-base leading-none mt-0.5">⚠</span>{t('keepReceipt')}</p></Card>
      <Btn variant="secondary" onClick={onReset}>{t('anotherTransaction')}</Btn>
    </div>
  )
}
