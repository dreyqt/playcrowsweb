import { useEffect, useMemo, useState } from 'react'
import type { FormData } from '../../types'
import type { PlayCrowsServer } from '../../server'
import { displayAmount } from '../../utils'
import { useI18n } from '../../i18n'
import {
  EVENT_BONUS_OPTION_COUNT,
  fetchEventBonusOptions,
  getEventBonusEntitlement,
  getEventBonusSelectionTotal,
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

function EventBonusSelectionCard({
  option,
  quantity,
  canAdd,
  disabled,
  onDecrease,
  onIncrease,
}: {
  option: EventBonusOption
  quantity: number
  canAdd: boolean
  disabled: boolean
  onDecrease: () => void
  onIncrease: () => void
}) {
  const selected = quantity > 0

  return (
    <div className={`rounded-xl border p-4 transition-colors ${selected ? 'border-[#c9aa68]/60 bg-[#c9aa68]/8' : 'border-[#292d34] bg-[#0d0f13]'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9aa68]">
            EVENT{option.eventNumber}
          </div>
          <div className="mt-1 text-sm font-bold text-[#eee9df]">{option.title}</div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Remove one EVENT${option.eventNumber} bonus`}
            disabled={disabled || quantity <= 0}
            onClick={onDecrease}
            className="h-9 w-9 rounded-lg border border-[#3b414b] bg-[#111318] text-lg font-bold text-[#eee9df] disabled:cursor-not-allowed disabled:opacity-35"
          >
            −
          </button>
          <div className={`min-w-10 rounded-lg border px-3 py-2 text-center text-sm font-black ${selected ? 'border-[#c9aa68]/50 bg-[#c9aa68]/10 text-[#c9aa68]' : 'border-[#3b414b] text-[#77746e]'}`}>
            {quantity}
          </div>
          <button
            type="button"
            aria-label={`Add one EVENT${option.eventNumber} bonus`}
            disabled={disabled || !canAdd}
            onClick={onIncrease}
            className="h-9 w-9 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 text-lg font-bold text-[#c9aa68] disabled:cursor-not-allowed disabled:opacity-35"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-[#292d34] pt-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">Reward Bundle</div>
        <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-[#aaa49a] sm:grid-cols-2">
          {option.rewards.map((reward, index) => (
            <li key={`${option.eventNumber}-${index}`} className="flex gap-2">
              <span className="text-[#c9aa68]" aria-hidden="true">◆</span>
              <span>{reward}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function StepComplete({ server, data, selectedPackageAmount, selectedPackageTitle, promoCode, onUpdate, onSubmit, onBack, isSubmitting, submitError }: {
  server: PlayCrowsServer
  data: FormData
  selectedPackageAmount: number | null
  selectedPackageTitle: string | null
  promoCode: string | null
  onUpdate: (partial: Partial<FormData>) => void
  onSubmit: () => Promise<void> | void
  onBack: () => void
  isSubmitting: boolean
  submitError: string
}) {
  const { t } = useI18n()
  const paymentLabel = data.paymentMethod ? PAYMENT_LABELS[data.paymentMethod] : t('notSelected')
  const promoApplied = promoCode === EARLY_PROMO_CODE && (isEarlyPromoActive(server) || data.paypalPaymentStatus === 'COMPLETED') && selectedPackageAmount !== null
  const packageQuantity = Math.max(1, Math.floor(Number(data.packageQuantity) || 1))
  const originalPackageAmount = selectedPackageAmount === null ? null : getPackageAmountInCurrency(selectedPackageAmount, data.currency, packageQuantity)
  const discountedPackageAmount = selectedPackageAmount === null ? null : getDiscountedPackageAmount(selectedPackageAmount, data.currency, packageQuantity)
  const eventBonusEntitlement = getEventBonusEntitlement(selectedPackageAmount, packageQuantity)
  const selectedBonusCount = getEventBonusSelectionTotal(data.eventBonusSelections)
  const [eventBonusOptions, setEventBonusOptions] = useState<EventBonusOption[]>([])
  const [eventBonusLoading, setEventBonusLoading] = useState(false)
  const [eventBonusError, setEventBonusError] = useState('')

  useEffect(() => {
    let cancelled = false

    if (eventBonusEntitlement <= 0) {
      setEventBonusOptions([])
      setEventBonusLoading(false)
      setEventBonusError('')
      return () => {
        cancelled = true
      }
    }

    setEventBonusLoading(true)
    setEventBonusError('')

    void fetchEventBonusOptions(server)
      .then(options => {
        if (cancelled) return
        setEventBonusOptions(options)
        setEventBonusLoading(false)
      })
      .catch(error => {
        if (cancelled) return
        setEventBonusOptions([])
        setEventBonusLoading(false)
        setEventBonusError(error instanceof Error ? error.message : 'Unable to load event reward options.')
      })

    return () => {
      cancelled = true
    }
  }, [server, eventBonusEntitlement])

  const eventBonusCatalogComplete = eventBonusEntitlement <= 0 || eventBonusOptions.length >= EVENT_BONUS_OPTION_COUNT[server]
  const validEventNumbers = useMemo(
    () => new Set(eventBonusOptions.map(option => option.eventNumber)),
    [eventBonusOptions]
  )
  const selectionsReferenceOnlyValidEvents = Object.entries(data.eventBonusSelections ?? {}).every(
    ([eventNumber, quantity]) => Number(quantity) <= 0 || validEventNumbers.has(eventNumber)
  )
  const eventBonusSelectionValid = eventBonusEntitlement <= 0 || (
    !eventBonusLoading &&
    !eventBonusError &&
    eventBonusCatalogComplete &&
    selectedBonusCount === eventBonusEntitlement &&
    selectionsReferenceOnlyValidEvents
  )

  const adjustEventBonus = (eventNumber: string, delta: number) => {
    if (isSubmitting) return
    const current = Math.max(0, Math.floor(Number(data.eventBonusSelections?.[eventNumber]) || 0))
    if (delta > 0 && selectedBonusCount >= eventBonusEntitlement) return

    const nextCount = Math.max(0, current + delta)
    const nextSelections = { ...(data.eventBonusSelections ?? {}) }

    if (nextCount > 0) nextSelections[eventNumber] = nextCount
    else delete nextSelections[eventNumber]

    onUpdate({ eventBonusSelections: nextSelections })
  }

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

      {eventBonusEntitlement > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-[#292d34] px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9aa68]">$100 Purchase Bonus</div>
                <div className="mt-1 text-lg font-bold text-[#eee9df]">Choose Your Event Reward Bonuses</div>
              </div>
              <div className={`rounded-full border px-3 py-1.5 text-xs font-black ${selectedBonusCount === eventBonusEntitlement ? 'border-[#22c55e]/45 bg-[#22c55e]/10 text-[#22c55e]' : 'border-[#c9aa68]/45 bg-[#c9aa68]/10 text-[#c9aa68]'}`}>
                {selectedBonusCount} / {eventBonusEntitlement} selected
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#aaa49a]">
              Every $100 of package value gives 1 event reward selection. Your ${((selectedPackageAmount ?? 0) * packageQuantity).toLocaleString()} purchase gives you <strong className="text-[#eee9df]">{eventBonusEntitlement}</strong> selection{eventBonusEntitlement === 1 ? '' : 's'}. You may choose the same event reward more than once.
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {eventBonusLoading && (
              <div className="rounded-xl border border-[#292d34] bg-[#0d0f13] px-4 py-5 text-center text-sm text-[#77746e]">
                Loading event reward bundles…
              </div>
            )}

            {eventBonusError && (
              <div role="alert" className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef8b8b]">
                Unable to load the event bonus catalog: {eventBonusError}
              </div>
            )}

            {!eventBonusLoading && !eventBonusError && !eventBonusCatalogComplete && (
              <div role="alert" className="rounded-xl border border-[#f59e0b]/35 bg-[#f59e0b]/5 px-4 py-3 text-xs leading-5 text-[#f6c66f]">
                The webshop expected {EVENT_BONUS_OPTION_COUNT[server]} event reward options for PlayCrows {server.toUpperCase()}, but only {eventBonusOptions.length} are currently available. Please contact staff before submitting.
              </div>
            )}

            {!eventBonusLoading && eventBonusOptions.map(option => (
              <EventBonusSelectionCard
                key={option.eventNumber}
                option={option}
                quantity={Math.max(0, Math.floor(Number(data.eventBonusSelections?.[option.eventNumber]) || 0))}
                canAdd={selectedBonusCount < eventBonusEntitlement}
                disabled={isSubmitting}
                onDecrease={() => adjustEventBonus(option.eventNumber, -1)}
                onIncrease={() => adjustEventBonus(option.eventNumber, 1)}
              />
            ))}

            {!eventBonusLoading && !eventBonusError && eventBonusCatalogComplete && selectedBonusCount !== eventBonusEntitlement && (
              <div className="rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 px-4 py-3 text-xs leading-5 text-[#d8c38f]">
                Select {eventBonusEntitlement - selectedBonusCount} more reward bundle{eventBonusEntitlement - selectedBonusCount === 1 ? '' : 's'} before submitting.
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-[#292d34] px-5 py-4"><div className="text-sm font-bold text-[#eee9df]">{t('donationDetails')}</div></div>
        <SummaryRow label={t('playerId')} value={data.playerId} />
        <SummaryRow label={t('username')} value={data.username} />

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
            <SummaryRow
              label={t('selectedPackageLabel')}
              value={selectedPackageAmount === null ? t('notSelected') : `${selectedPackageTitle ?? t('package')} · $${selectedPackageAmount.toLocaleString()} × ${data.packageQuantity}`}
            />
          </>
        )}

        {eventBonusEntitlement > 0 && (
          <SummaryRow
            label="Event Bonus Rewards"
            value={summarizeEventBonusSelections(data.eventBonusSelections) || `Select ${eventBonusEntitlement} reward bundle${eventBonusEntitlement === 1 ? '' : 's'}`}
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

      <div className="rounded-xl border border-[#c9aa68]/25 bg-[#c9aa68]/5 px-4 py-4">
        <div className="text-sm font-bold text-[#c9aa68]">{t('whatNext')}</div>
        <p className="mt-2 text-xs leading-5 text-[#a8b2c5]">
          {t('whatNextDesc')}
        </p>
      </div>

      {submitError && <div role="alert" className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs leading-5 text-[#ef4444]">{submitError}</div>}

      <div className="flex items-center justify-between gap-4">
        <Btn variant="ghost" onClick={onBack} disabled={isSubmitting}>{t('back')}</Btn>
        <Btn onClick={() => void onSubmit()} disabled={!canSubmit}>{isSubmitting ? t('submitting') : t('submitDonation')}</Btn>
      </div>
    </div>
  )
}
