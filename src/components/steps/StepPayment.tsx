import { useState } from 'react'
import type { FormData, PaymentMethod } from '../../types'
import {
  PAYMENT_METHODS,
  PAYMENT_INFO,
} from '../../constants'
import { displayAmount } from '../../utils'
import { useI18n } from '../../i18n'
import {
  EARLY_PROMO_CODE,
  EARLY_PROMO_DISCOUNT_PERCENT,
  formatCurrencyAmount,
  getDiscountedPackageAmount,
  getPackageAmountInCurrency,
  isEarlyPromoActive,
  type PromoApplyResult,
} from '../../promo'
import { Btn, Card } from '../ui'
import {
  CheckIcon,
  PayPalIcon,
  GCashIcon,
  WiseIcon,
  BybitIcon,
} from '../icons'
import gcashQr from '../../assets/gcash-qr.jpg'
import bybitQr from '../../assets/bybit-qr.png'
import wiseQr from '../../assets/wise-qr.png'

function MethodIcon({
  id,
  size = 36,
}: {
  id: PaymentMethod
  size?: number
}) {
  if (id === 'paypal') {
    return <PayPalIcon size={size} />
  }

  if (id === 'gcash') {
    return <GCashIcon size={size} />
  }

  if (id === 'wise') {
    return <WiseIcon size={size} />
  }

  if (id === 'bybit') {
    return <BybitIcon size={size} />
  }

  return null
}

function GCashQR() {
  return (
    <div className="mx-auto h-40 w-40 overflow-hidden rounded-xl border border-[#252a38] bg-white p-2">
      <img
        src={gcashQr}
        alt="GCash QR code"
        className="h-full w-full object-contain"
      />
    </div>
  )
}

function BybitQR() {
  return (
    <div className="mx-auto h-48 w-48 overflow-hidden rounded-xl border border-[#66d4ff]/40 bg-white p-2">
      <img
        src={bybitQr}
        alt="Bybit USDT TRC20 wallet QR code"
        className="h-full w-full object-contain"
      />
    </div>
  )
}

function PaymentDetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#252a38] px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-[#6b7280]">
        {label}
      </span>

      <span
        className={`break-all text-sm font-medium text-[#e8eaf0] ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function StepPayment({
  data,
  selectedPackageAmount,
  appliedPromoCode,
  onApplyPromoCode,
  onRemovePromoCode,
  onUpdate,
  onNext,
  onBack,
}: {
  data: FormData
  selectedPackageAmount: number | null
  appliedPromoCode: string | null
  onApplyPromoCode: (code: string) => PromoApplyResult
  onRemovePromoCode: () => void
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const [redeemCode, setRedeemCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [promoMessageType, setPromoMessageType] =
    useState<'success' | 'error' | ''>('')

  const amtDisplay = displayAmount(data)
  const promoApplied =
    appliedPromoCode === EARLY_PROMO_CODE &&
    isEarlyPromoActive()

  const originalPackageAmount =
    selectedPackageAmount === null
      ? null
      : getPackageAmountInCurrency(
          selectedPackageAmount,
          data.currency
        )

  const discountedPackageAmount =
    selectedPackageAmount === null
      ? null
      : getDiscountedPackageAmount(
          selectedPackageAmount,
          data.currency
        )

  const usdEquivalent = (() => {
    if (
      promoApplied &&
      selectedPackageAmount !== null
    ) {
      return (
        selectedPackageAmount *
        (1 - EARLY_PROMO_DISCOUNT_PERCENT / 100)
      )
    }

    const presetAmount = Number(data.amount)

    return Number.isFinite(presetAmount)
      ? presetAmount
      : 0
  })()

  const applyCode = () => {
    const result = onApplyPromoCode(redeemCode)

    setPromoMessage(result.message)
    setPromoMessageType(
      result.success ? 'success' : 'error'
    )

    if (result.success) {
      setRedeemCode(EARLY_PROMO_CODE)
    }
  }

  const removeCode = () => {
    onRemovePromoCode()
    setRedeemCode('')
    setPromoMessage(t('redeemRemoved'))
    setPromoMessageType('')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">
          {t('choosePayment')}
        </h2>

        <p className="text-sm text-[#6b7280]">
          {t('choosePaymentDesc')}
        </p>
      </div>

      {/* Order Summary */}
      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
              {t('username')}
            </div>

            <div className="text-sm font-medium text-[#66d4ff]">
              {data.playerId}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
              {t('characterName')}
            </div>

            <div className="text-sm font-medium text-[#66d4ff]">
              {data.username}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
            {promoApplied ? t('amountToPay') : t('amount')}
          </div>

          {promoApplied &&
          originalPackageAmount !== null &&
          discountedPackageAmount !== null ? (
            <>
              <div className="text-xs text-[#6b7280] line-through">
                {formatCurrencyAmount(
                  data.currency,
                  originalPackageAmount
                )}
              </div>

              <div className="text-xl font-bold text-[#66d4ff]">
                {formatCurrencyAmount(
                  data.currency,
                  discountedPackageAmount
                )}
              </div>

              <div className="mt-1 text-[10px] font-bold text-[#22c55e]">
                {EARLY_PROMO_DISCOUNT_PERCENT}% {t('discountApplied')}
              </div>
            </>
          ) : (
            <div className="text-lg font-bold text-[#e8eaf0]">
              {amtDisplay}
            </div>
          )}

          {data.currency !== 'USD' && (
            <div className="text-[10px] text-[#6b7280]">
              ≈ ${usdEquivalent.toFixed(2)} USD
            </div>
          )}
        </div>
      </Card>

      {/* Redeem Code */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-bold text-[#e8eaf0]">
              {t('redeemCode')}
            </div>

            <p className="mt-1 text-xs leading-5 text-[#6b7280]">
              {t('redeemDesc')}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={redeemCode}
              onChange={event =>
                setRedeemCode(
                  event.target.value.toUpperCase()
                )
              }
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyCode()
                }
              }}
              placeholder={t('enterRedeem')}
              disabled={promoApplied}
              className="min-h-11 flex-1 rounded-lg border border-[#353c52] bg-[#0f1219] px-3 text-sm font-semibold uppercase tracking-wider text-[#e8eaf0] outline-none transition focus:border-[#66d4ff] disabled:cursor-not-allowed disabled:opacity-70"
            />

            {promoApplied ? (
              <button
                type="button"
                onClick={removeCode}
                className="min-h-11 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 px-4 text-xs font-bold text-[#ef4444] transition hover:bg-[#ef4444]/10"
              >
                {t('remove')}
              </button>
            ) : (
              <button
                type="button"
                onClick={applyCode}
                disabled={!redeemCode.trim()}
                className="min-h-11 rounded-lg border border-[#66d4ff]/50 bg-[#66d4ff]/10 px-5 text-xs font-bold text-[#66d4ff] transition hover:bg-[#66d4ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('applyCode')}
              </button>
            )}
          </div>

          {promoApplied &&
          selectedPackageAmount !== null &&
          discountedPackageAmount !== null ? (
            <div className="rounded-xl border border-[#22c55e]/35 bg-[#22c55e]/5 px-4 py-3">
              <div className="text-sm font-bold text-[#22c55e]">
                {EARLY_PROMO_CODE} {t('appliedSuccessfully')}
              </div>

              <p className="mt-1 text-xs leading-5 text-[#b8c3d4]">
                {t('pay')}{' '}
                <strong className="text-[#e8eaf0]">
                  {formatCurrencyAmount(data.currency, discountedPackageAmount)}
                </strong>{' '}
                <strong className="text-[#e8eaf0]">${selectedPackageAmount.toLocaleString()}</strong>{' '}
                {t('receiveFullPackage')}
              </p>
            </div>
          ) : (
            promoMessage && (
              <div
                className={`rounded-lg border px-4 py-3 text-xs leading-5 ${
                  promoMessageType === 'error'
                    ? 'border-[#ef4444]/35 bg-[#ef4444]/5 text-[#ef4444]'
                    : promoMessageType === 'success'
                      ? 'border-[#22c55e]/35 bg-[#22c55e]/5 text-[#22c55e]'
                      : 'border-[#353c52] bg-[#0f1219] text-[#9aa6ba]'
                }`}
              >
                {promoMessage}
              </div>
            )
          )}

          {!isEarlyPromoActive() && (
            <div className="text-xs text-[#ef4444]">
              {t('earlyPromotionEnded')}
            </div>
          )}
        </div>
      </Card>

      {/* Payment Methods */}
      <div className="flex flex-col gap-3">
        {PAYMENT_METHODS.map(method => {
          const selected =
            data.paymentMethod === method.id

          return (
            <button
              type="button"
              key={method.id}
              onClick={() =>
                onUpdate({
                  paymentMethod: method.id,
                })
              }
              className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                selected
                  ? 'border-[#66d4ff] bg-[#66d4ff]/5'
                  : 'border-[#252a38] bg-[#13161e] hover:border-[#353c52]'
              }`}
            >
              <MethodIcon
                id={method.id}
                size={36}
              />

              <div className="flex-1">
                <div className="text-sm font-semibold text-[#e8eaf0]">
                  {method.label}
                </div>

                <div className="mt-0.5 text-xs text-[#6b7280]">
                  {method.id === 'paypal' ? t('paypalDesc') : method.id === 'gcash' ? t('gcashDesc') : method.id === 'wise' ? t('wiseDesc') : t('bybitDesc')}
                </div>
              </div>

              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                  selected
                    ? 'border-[#66d4ff] bg-[#66d4ff] text-[#0d0f14]'
                    : 'border-[#353c52]'
                }`}
              >
                {selected && (
                  <CheckIcon size={10} />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Payment Details */}
      {data.paymentMethod && (
        <Card className="flex flex-col gap-5 p-6">
          {/* Payment Method Header */}
          <div className="flex items-center gap-3">
            <MethodIcon
              id={data.paymentMethod}
              size={28}
            />

            <div className="text-sm font-bold text-[#e8eaf0]">
              {data.paymentMethod === 'gcash' &&
                `GCash ${t('paymentDetails')}`}

              {data.paymentMethod === 'paypal' &&
                `PayPal ${t('paymentDetails')}`}

              {data.paymentMethod === 'wise' &&
                `Wise ${t('paymentDetails')}`}

              {data.paymentMethod === 'bybit' &&
                `Bybit ${t('paymentDetails')}`}
            </div>
          </div>

          {/* GCash */}
          {data.paymentMethod === 'gcash' && (
            <>
              <GCashQR />

              <p className="text-center text-xs text-[#6b7280]">
                {t('scanGcash')}
              </p>

              <div className="flex flex-col gap-2 rounded-xl bg-[#13161e] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">
                    {t('accountName')}
                  </span>

                  <span className="text-sm font-medium text-[#e8eaf0]">
                    {PAYMENT_INFO.gcash.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">
                    {t('accountNumber')}
                  </span>

                  <span className="font-mono text-sm font-medium text-[#e8eaf0]">
                    {PAYMENT_INFO.gcash.number}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* PayPal */}
          {data.paymentMethod === 'paypal' && (
            <>
              <div className="rounded-xl border border-[#f5a623]/40 bg-[#f5a623]/5 p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 text-lg text-[#f5a623]">
                    ⚠️
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-bold text-[#f5a623]">
                      {t('paypalInstructions')}
                    </div>

                    <p className="text-xs leading-relaxed text-[#d1d5db]">
                      {t('paypalFriendsFamily')}
                    </p>

                    <p className="text-xs leading-relaxed text-[#6b7280]">
                      {t('paypalCorrectType')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#13161e] p-4">
                <PayPalIcon size={40} />

                <div>
                  <div className="text-xs text-[#6b7280]">
                    {t('paypalEmail')}
                  </div>

                  <div className="text-sm font-medium text-[#e8eaf0]">
                    {PAYMENT_INFO.paypal.email}
                  </div>
                </div>
              </div>

              <a
                href={PAYMENT_INFO.paypal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Btn className="w-full">
                  <PayPalIcon size={18} />
                  {t('openPaypal')}
                </Btn>
              </a>
            </>
          )}

{/* Wise */}
{data.paymentMethod === 'wise' && (
  <>
    <div className="mx-auto h-48 w-48 overflow-hidden rounded-xl border border-[#66d4ff]/40 bg-white p-2">
      <img
        src={wiseQr}
        alt="Wise payment QR code"
        className="h-full w-full object-contain"
      />
    </div>

    <p className="text-center text-xs leading-5 text-[#6b7280]">
      {t('scanWise')}
    </p>

    <div className="flex flex-col gap-0 overflow-hidden rounded-xl bg-[#13161e]">
      <PaymentDetailRow label={t('accountName')} value={PAYMENT_INFO.wise.accountName} mono />
      <PaymentDetailRow label={t('wisetag')} value={PAYMENT_INFO.wise.wisetag} mono />
    </div>

    <a
      href={PAYMENT_INFO.wise.link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#66d4ff] bg-[#66d4ff] px-4 py-2 text-sm font-bold text-[#06141b] transition-colors hover:bg-[#8ae2ff]"
    >
      <WiseIcon size={18} />
      {t('openWise')}
    </a>

    <p className="text-center text-xs leading-5 text-[#6b7280]">
      {t('saveScreenshotNext')}
    </p>
  </>
)}

          {/* Bybit */}
          {data.paymentMethod === 'bybit' && (
            <>
              <div className="rounded-xl border border-[#66d4ff]/30 bg-[#66d4ff]/5 p-4">
                <div className="text-sm font-bold text-[#66d4ff]">
                  {t('chooseBybitMethod')}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#a8b2c5]">
                  {t('bybitMethodDesc')}
                </p>
              </div>

              {/* Internal Transfer */}
              <div className="overflow-hidden rounded-xl border border-[#252a38] bg-[#13161e]">
                <div className="border-b border-[#252a38] px-4 py-3">
                  <div className="text-sm font-bold text-[#e8eaf0]">
                    {t('bybitInternal')}
                  </div>

                  <div className="mt-1 text-xs text-[#6b7280]">
                    {t('bybitUidDesc')}
                  </div>
                </div>

                <PaymentDetailRow
                  label={t('bybitUid')}
                  value={PAYMENT_INFO.bybit.uid}
                  mono
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#252a38]" />

                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                  {t('or')}
                </span>

                <div className="h-px flex-1 bg-[#252a38]" />
              </div>

              {/* USDT Transfer */}
              <div className="overflow-hidden rounded-xl border border-[#252a38] bg-[#13161e]">
                <div className="border-b border-[#252a38] px-4 py-3">
                  <div className="text-sm font-bold text-[#e8eaf0]">
                    {t('usdtOnchain')}
                  </div>

                  <div className="mt-1 text-xs text-[#6b7280]">
                    {t('usdtDesc')}
                  </div>
                </div>

                <div className="p-5">
                  <BybitQR />
                </div>

                <PaymentDetailRow
                  label={t('asset')}
                  value={PAYMENT_INFO.bybit.asset}
                />

                <PaymentDetailRow
                  label={t('network')}
                  value={PAYMENT_INFO.bybit.network}
                />

                <PaymentDetailRow
                  label={t('walletAddress')}
                  value={PAYMENT_INFO.bybit.address}
                  mono
                />
              </div>

              <div className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 text-lg text-[#ef4444]">
                    ⚠
                  </div>

                  <div>
                    <div className="text-sm font-bold text-[#ef4444]">
                      {t('networkWarning')}
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-[#c8cfda]">
                      {t('networkWarningDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs leading-relaxed text-[#6b7280]">
                {t('saveTransferReceipt')}
              </p>
            </>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Btn
          variant="ghost"
          onClick={onBack}
        >
          {t('back')}
        </Btn>

        <Btn
          onClick={onNext}
          disabled={!data.paymentMethod}
        >
          {t('continueReceipt')}
        </Btn>
      </div>
    </div>
  )
}