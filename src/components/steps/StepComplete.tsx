import type { FormData } from '../../types'
import type { PlayCrowsServer } from '../../server'
import { displayAmount } from '../../utils'
import { useI18n } from '../../i18n'
import { useBonusI18n } from '../../bonusI18n'
import {
  isEventBonusSelectionValid,
  getEventBonusEntitlement,
  summarizeEventBonusSelections,
  type EventBonusOption,
} from '../../eventBonus'
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
  paypal: 'PayPal',
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

export function StepComplete({ server, data, selectedPackageAmount, selectedPackageTitle, promoCode, eventBonusOptions, onSubmit, onBack, isSubmitting, submitError }: {
  server: PlayCrowsServer
  data: FormData
  selectedPackageAmount: number | null
  selectedPackageTitle: string | null
  promoCode: string | null
  eventBonusOptions: EventBonusOption[]
  onSubmit: () => Promise<void> | void
  onBack: () => void
  isSubmitting: boolean
  submitError: string
}) {
  const { t } = useI18n()
  const { t: bonusText } = useBonusI18n()
  const paymentLabel = data.paymentMethod ? PAYMENT_LABELS[data.paymentMethod] : t('notSelected')
  const promoApplied = promoCode === EARLY_PROMO_CODE && (isEarlyPromoActive(server) || data.paypalPaymentStatus === 'COMPLETED') && selectedPackageAmount !== null
  const packageQuantity = Math.max(1, Math.floor(Number(data.packageQuantity) || 1))
  const originalPackageAmount = selectedPackageAmount === null ? null : getPackageAmountInCurrency(selectedPackageAmount, data.currency, packageQuantity)
  const discountedPackageAmount = selectedPackageAmount === null ? null : getDiscountedPackageAmount(selectedPackageAmount, data.currency, packageQuantity)
  const eventBonusEntitlement = getEventBonusEntitlement(selectedPackageAmount, packageQuantity)
  const eventBonusSelectionValid = isEventBonusSelectionValid(server, eventBonusEntitlement, data.eventBonusSelections, eventBonusOptions)

  const canSubmit = !isSubmitting &&
    Boolean(data.paymentMethod) &&
    (data.paymentMethod === 'paypal'
      ? Boolean(data.paypalCaptureId && data.paypalPaymentStatus === 'COMPLETED')
      : Boolean(data.receiptFile)) &&
    eventBonusSelectionValid

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
        <SummaryRow label="Server" value={`PlayCrows ${server.toUpperCase()}`} />
        <SummaryRow
          label={t('selectedPackageLabel')}
          value={selectedPackageAmount === null ? t('notSelected') : `${selectedPackageTitle ?? t('package')} · $${selectedPackageAmount.toLocaleString()} × ${data.packageQuantity}`}
        />

        {promoApplied && selectedPackageAmount !== null && originalPackageAmount !== null && discountedPackageAmount !== null ? (
          <>
            <SummaryRow label={t('giftPackageCredit')} value={`$${(selectedPackageAmount * packageQuantity).toLocaleString()} ($${selectedPackageAmount.toLocaleString()} × ${packageQuantity})`} />
            <SummaryRow label={t('originalPayment')} value={formatCurrencyAmount(data.currency, originalPackageAmount)} />
            <SummaryRow label={t('redeemCode')} value={EARLY_PROMO_CODE} />
            <SummaryRow label={t('discount')} value={`${EARLY_PROMO_DISCOUNT_PERCENT}%`} />
            <SummaryRow label={t('amountToPay')} value={formatCurrencyAmount(data.currency, discountedPackageAmount)} />
          </>
        ) : (
          <>
            <SummaryRow label={t('supportAmountTitle')} value={displayAmount(data)} />
          </>
        )}

        {eventBonusEntitlement > 0 && (
          <SummaryRow
            label={bonusText('bonusRewards')}
            value={summarizeEventBonusSelections(data.eventBonusSelections) || bonusText('selectionInvalid')}
          />
        )}
        <SummaryRow label={t('paymentMethod')} value={paymentLabel} />
        {data.paymentMethod === 'paypal' ? (
          <SummaryRow label="Payment Verification" value={data.paypalCaptureId ? `Verified by PayPal · ${data.paypalCaptureId}` : 'Awaiting PayPal verification'} />
        ) : (
          <SummaryRow label={t('paymentReceipt')} value={data.receiptFile?.name ?? t('notUploaded')} />
        )}
        <SummaryRow label={t('additionalNotes')} value={data.additionalNotes.trim() || t('none')} />
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#eee9df]">{bonusText('bonusRewards')}</h3>
          <button type="button" onClick={onBack} disabled={isSubmitting} className="min-h-11 rounded-lg border border-[#c9aa68]/40 px-3 py-2 text-xs font-semibold text-[#c9aa68] disabled:opacity-40">
            {bonusText('editBonuses')}
          </button>
        </div>
        {eventBonusEntitlement === 0 ? (
          <p className="mt-3 text-sm text-[#aaa49a]">{bonusText('noBonus')}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-semibold text-[#c9aa68]">{bonusText('selectedBundles', { count: eventBonusEntitlement })}</p>
            {eventBonusOptions.filter(option => data.eventBonusSelections[option.eventNumber] > 0).map(option => (
              <div key={option.eventNumber} className="rounded-xl border border-[#292d34] bg-[#0d0f13] p-4">
                <div className="text-sm font-bold text-[#eee9df]">EVENT{option.eventNumber} · {option.title} × {data.eventBonusSelections[option.eventNumber]}</div>
                <p className="mt-3 text-xs font-semibold text-[#c9aa68]">{bonusText('rewardsPerBundle')}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-[#aaa49a]">
                  {option.rewards.map((reward, index) => <li key={index}>{reward}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!eventBonusSelectionValid && <p role="alert" className="mt-3 text-sm text-[#ef8b8b]">{bonusText('selectionInvalid')}</p>}
      </Card>

      <div className="rounded-xl border border-[#c9aa68]/25 bg-[#c9aa68]/5 px-4 py-4">
        <div className="text-sm font-bold text-[#c9aa68]">{t('whatNext')}</div>
        <p className="mt-2 text-xs leading-5 text-[#a8b2c5]">
          {t('whatNextDesc')}
        </p>
      </div>

      {submitError && <div role="alert" className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef4444]">{submitError}</div>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Btn variant="ghost" onClick={onBack} disabled={isSubmitting}>{t('back')}</Btn>
        <Btn onClick={() => void onSubmit()} disabled={!canSubmit}>{isSubmitting ? t('submitting') : t('submitDonation')}</Btn>
      </div>
    </div>
  )
}
