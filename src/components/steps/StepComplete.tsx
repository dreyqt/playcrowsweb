import type { FormData } from '../../types'
import { displayAmount } from '../../utils'
import { useI18n } from '../../i18n'
import {
  EARLY_PROMO_CODE,
  EARLY_PROMO_DISCOUNT_PERCENT,
  formatCurrencyAmount,
  getDiscountedPackageAmount,
  getPackageAmountInCurrency,
  isEarlyPromoActive,
} from '../../promo'
import { Btn, Card } from '../ui'

const PAYMENT_LABELS = {
  paddle: 'Paddle',
  gcash: 'GCash',
  wise: 'Wise',
  bybit: 'Bybit',
} as const

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#292d34] px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-[#77746e]">{label}</span>
      <span className="break-all text-sm font-medium text-[#eee9df]">{value}</span>
    </div>
  )
}

export function StepComplete({ data, selectedPackageAmount, selectedPackageTitle, promoCode, onSubmit, onBack, isSubmitting, submitError }: {
  data: FormData
  selectedPackageAmount: number | null
  selectedPackageTitle: string | null
  promoCode: string | null
  onSubmit: () => Promise<void> | void
  onBack: () => void
  isSubmitting: boolean
  submitError: string
}) {
  const { t } = useI18n()
  const paymentLabel = data.paymentMethod ? PAYMENT_LABELS[data.paymentMethod] : t('notSelected')
  const promoApplied = promoCode === EARLY_PROMO_CODE && isEarlyPromoActive() && selectedPackageAmount !== null
  const originalPackageAmount = selectedPackageAmount === null ? null : getPackageAmountInCurrency(selectedPackageAmount, data.currency)
  const discountedPackageAmount = selectedPackageAmount === null ? null : getDiscountedPackageAmount(selectedPackageAmount, data.currency)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#eee9df]">{t('reviewSubmission')}</h2>
        <p className="text-sm leading-6 text-[#77746e]">{t('reviewSubmissionDesc')}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[#292d34] px-5 py-4"><div className="text-sm font-bold text-[#eee9df]">{t('donationDetails')}</div></div>
        <SummaryRow label={t('playerId')} value={data.playerId} />
        <SummaryRow label={t('username')} value={data.username} />

        {promoApplied && selectedPackageAmount !== null && originalPackageAmount !== null && discountedPackageAmount !== null ? (
          <>
            <SummaryRow label={t('giftPackageCredit')} value={`$${selectedPackageAmount.toLocaleString()}`} />
            <SummaryRow label={t('originalPayment')} value={formatCurrencyAmount(data.currency, originalPackageAmount)} />
            <SummaryRow label={t('redeemCode')} value={EARLY_PROMO_CODE} />
            <SummaryRow label={t('discount')} value={`${EARLY_PROMO_DISCOUNT_PERCENT}%`} />
            <SummaryRow label={t('amountToPay')} value={formatCurrencyAmount(data.currency, discountedPackageAmount)} />
          </>
        ) : (
          <>
            <SummaryRow label={t('supportAmountTitle')} value={displayAmount(data)} />
            <SummaryRow
              label={t('selectedPackageLabel')}
              value={selectedPackageAmount === null ? t('notSelected') : `${selectedPackageTitle ?? t('package')} · $${selectedPackageAmount.toLocaleString()} × ${data.packageQuantity}`}
            />
          </>
        )}

        <SummaryRow label={t('paymentMethod')} value={paymentLabel} />
        <SummaryRow label={t('paymentReceipt')} value={data.receiptFile?.name ?? t('notUploaded')} />
        <SummaryRow label={t('additionalNotes')} value={data.additionalNotes.trim() || t('none')} />
      </Card>

      <div className="rounded-xl border border-[#c9aa68]/25 bg-[#c9aa68]/5 px-4 py-4">
        <div className="text-sm font-bold text-[#c9aa68]">{t('whatNext')}</div>
        <p className="mt-2 text-xs leading-5 text-[#a8b2c5]">
          {t('whatNextDesc')}
          {promoApplied && <> {t('cumulativeCreditDesc')}</>}
        </p>
      </div>

      {submitError && <div role="alert" className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef4444]">{submitError}</div>}

      <div className="flex items-center justify-between gap-4">
        <Btn variant="ghost" onClick={onBack} disabled={isSubmitting}>{t('back')}</Btn>
        <Btn onClick={() => void onSubmit()} disabled={isSubmitting || !data.receiptFile || !data.paymentMethod}>{isSubmitting ? t('submitting') : t('submitDonation')}</Btn>
      </div>
    </div>
  )
}
