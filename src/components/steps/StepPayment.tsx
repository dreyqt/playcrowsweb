import { useCallback, useEffect, useRef, useState } from 'react'
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

function getRequiredEnvironmentVariable(name: string, value?: string) {
  if (!value) {
    throw new Error(`${name} is missing. Add it to your Vercel environment variables and redeploy.`)
  }

  return value.replace(/\/$/, '')
}

let paypalSdkPromise: Promise<any> | null = null

function loadPayPalSdk() {
  const existingPayPal = (window as any).paypal
  if (existingPayPal?.Buttons) return Promise.resolve(existingPayPal)
  if (paypalSdkPromise) return paypalSdkPromise

  paypalSdkPromise = new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

    if (!clientId) {
      reject(new Error('VITE_PAYPAL_CLIENT_ID is not configured.'))
      return
    }

    const existingScript = document.getElementById('paypal-standard-checkout-sdk') as HTMLScriptElement | null

    const finish = () => {
      const paypal = (window as any).paypal
      if (paypal?.Buttons) resolve(paypal)
      else reject(new Error('PayPal SDK loaded without the Buttons component.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load PayPal checkout.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'paypal-standard-checkout-sdk'
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`
    script.async = true
    script.onload = finish
    script.onerror = () => reject(new Error('Unable to load PayPal checkout.'))
    document.head.appendChild(script)
  })

  return paypalSdkPromise
}

async function callPayPalCheckout(body: Record<string, unknown>) {
  const supabaseUrl = getRequiredEnvironmentVariable(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL
  )
  const publishableKey = getRequiredEnvironmentVariable(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )

  const response = await fetch(`${supabaseUrl}/functions/v1/paypal-checkout`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `PayPal request failed with status ${response.status}.`
    throw new Error(message)
  }

  return payload as any
}

function PayPalCheckout({
  data,
  selectedPackageId,
  promoCode,
  onCompleted,
}: {
  data: FormData
  selectedPackageId: string | null
  promoCode: string | null
  onCompleted: (result: {
    orderId: string
    captureId: string
    status: 'COMPLETED'
  }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'completed' | 'error'>('loading')
  const [message, setMessage] = useState('Loading secure PayPal checkout…')

  useEffect(() => {
    let cancelled = false
    let buttons: any = null

    if (data.paypalPaymentStatus === 'COMPLETED' && data.paypalCaptureId) {
      setStatus('completed')
      setMessage(`Payment completed · ${data.paypalCaptureId}`)
      return () => { cancelled = true }
    }

    const render = async () => {
      if (!selectedPackageId) {
        setStatus('error')
        setMessage('Please select a support package before using PayPal.')
        return
      }

      try {
        const paypal = await loadPayPalSdk()
        if (cancelled || !containerRef.current) return

        containerRef.current.innerHTML = ''

        buttons = paypal.Buttons({
          fundingSource: paypal.FUNDING?.PAYPAL,
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 48,
          },
          createOrder: async () => {
            setStatus('processing')
            setMessage('Creating your secure PayPal order…')

            const result = await callPayPalCheckout({
              action: 'create',
              selectedPackageId,
              packageQuantity: Number(data.packageQuantity),
              promoCode,
              playerId: data.playerId,
              username: data.username,
            })

            setStatus('ready')
            setMessage('Complete your payment securely with PayPal.')
            return result.orderId
          },
          onApprove: async (approval: { orderID: string }) => {
            setStatus('processing')
            setMessage('Confirming your PayPal payment…')

            const result = await callPayPalCheckout({
              action: 'capture',
              orderId: approval.orderID,
            })

            if (result.status !== 'COMPLETED' || !result.captureId) {
              throw new Error('PayPal did not return a completed payment.')
            }

            if (cancelled) return

            setStatus('completed')
            setMessage(`Payment completed · ${result.captureId}`)
            onCompleted({
              orderId: approval.orderID,
              captureId: result.captureId,
              status: 'COMPLETED',
            })
          },
          onCancel: () => {
            if (cancelled) return
            setStatus('ready')
            setMessage('PayPal checkout was cancelled. You can try again when ready.')
          },
          onError: (error: unknown) => {
            console.error('PayPal checkout error:', error)
            if (cancelled) return
            setStatus('error')
            setMessage(error instanceof Error ? error.message : 'PayPal checkout could not be completed. Please try again.')
          },
        })

        if (buttons?.isEligible && !buttons.isEligible()) {
          setStatus('error')
          setMessage('PayPal is not available for this browser or location.')
          return
        }

        await buttons.render(containerRef.current)
        if (!cancelled) {
          setStatus('ready')
          setMessage('Complete your payment securely with PayPal.')
        }
      } catch (error) {
        console.error('PayPal initialization error:', error)
        if (!cancelled) {
          setStatus('error')
          setMessage(error instanceof Error ? error.message : 'Unable to load PayPal checkout.')
        }
      }
    }

    void render()

    return () => {
      cancelled = true
      try { buttons?.close?.() } catch { /* PayPal cleanup is best-effort. */ }
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [
    data.packageQuantity,
    data.paypalCaptureId,
    data.paypalPaymentStatus,
    data.playerId,
    data.username,
    promoCode,
    selectedPackageId,
    onCompleted,
  ])

  return (
    <div className="flex flex-col gap-3">
      {status !== 'completed' && <div ref={containerRef} className="min-h-[48px] w-full" aria-label="PayPal checkout" />}
      <div
        className={`rounded-lg border px-3 py-2 text-center text-xs leading-5 ${
          status === 'completed'
            ? 'border-[#22c55e]/35 bg-[#22c55e]/5 text-[#22c55e]'
            : status === 'error'
              ? 'border-[#ef4444]/35 bg-[#ef4444]/5 text-[#ef4444]'
              : 'border-[#292d34] bg-[#0d0f13] text-[#aaa49a]'
        }`}
      >
        {message}
      </div>
    </div>
  )
}

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
    <div className="mx-auto h-40 w-40 overflow-hidden rounded-xl border border-[#292d34] bg-white p-2">
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
    <div className="mx-auto h-48 w-48 overflow-hidden rounded-xl border border-[#c9aa68]/40 bg-white p-2">
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
    <div className="flex flex-col gap-1 border-b border-[#292d34] px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-[#77746e]">
        {label}
      </span>

      <span
        className={`break-all text-sm font-medium text-[#eee9df] ${
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
  selectedPackageId,
  appliedPromoCode,
  onApplyPromoCode,
  onRemovePromoCode,
  onUpdate,
  onNext,
  onBack,
}: {
  data: FormData
  selectedPackageAmount: number | null
  selectedPackageId: string | null
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

  const completePayPalPayment = useCallback((result: { orderId: string; captureId: string; status: 'COMPLETED' }) => {
    onUpdate({
      paymentMethod: 'paypal',
      currency: 'USD',
      paypalOrderId: result.orderId,
      paypalCaptureId: result.captureId,
      paypalPaymentStatus: result.status,
    })
    onNext()
  }, [onNext, onUpdate])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#eee9df]">
          {t('choosePayment')}
        </h2>

        <p className="text-sm text-[#77746e]">
          {t('choosePaymentDesc')}
        </p>
      </div>

      {/* Order Summary */}
      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#77746e]">
              {t('username')}
            </div>

            <div className="text-sm font-medium text-[#c9aa68]">
              {data.playerId}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#77746e]">
              {t('characterName')}
            </div>

            <div className="text-sm font-medium text-[#c9aa68]">
              {data.username}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#77746e]">
            {promoApplied ? t('amountToPay') : t('amount')}
          </div>

          {promoApplied &&
          originalPackageAmount !== null &&
          discountedPackageAmount !== null ? (
            <>
              <div className="text-xs text-[#77746e] line-through">
                {formatCurrencyAmount(
                  data.currency,
                  originalPackageAmount
                )}
              </div>

              <div className="text-xl font-bold text-[#c9aa68]">
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
            <div className="text-lg font-bold text-[#eee9df]">
              {amtDisplay}
            </div>
          )}

          {data.currency !== 'USD' && (
            <div className="text-[10px] text-[#77746e]">
              ≈ ${usdEquivalent.toFixed(2)} USD
            </div>
          )}
        </div>
      </Card>

      {/* Redeem Code */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-bold text-[#eee9df]">
              {t('redeemCode')}
            </div>

            <p className="mt-1 text-xs leading-5 text-[#77746e]">
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
              className="min-h-11 flex-1 rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 text-sm font-semibold uppercase tracking-wider text-[#eee9df] outline-none transition focus:border-[#c9aa68] disabled:cursor-not-allowed disabled:opacity-70"
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
                className="min-h-11 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-5 text-xs font-bold text-[#c9aa68] transition hover:bg-[#c9aa68]/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                <strong className="text-[#eee9df]">
                  {formatCurrencyAmount(data.currency, discountedPackageAmount)}
                </strong>{' '}
                <strong className="text-[#eee9df]">${selectedPackageAmount.toLocaleString()}</strong>{' '}
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
                      : 'border-[#3b414b] bg-[#0d0f13] text-[#aaa49a]'
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
                  ...(method.id === 'paypal' ? { currency: 'USD' as const } : {}),
                  ...(method.id !== 'paypal'
                    ? {
                        paypalOrderId: null,
                        paypalCaptureId: null,
                        paypalPaymentStatus: null,
                      }
                    : {}),
                })
              }
              className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                selected
                  ? 'border-[#c9aa68] bg-[#c9aa68]/5'
                  : 'border-[#292d34] bg-[#111318] hover:border-[#3b414b]'
              }`}
            >
              <MethodIcon
                id={method.id}
                size={36}
              />

              <div className="flex-1">
                <div className="text-sm font-semibold text-[#eee9df]">
                  {method.label}
                </div>

                <div className="mt-0.5 text-xs text-[#77746e]">
                  {method.id === 'paypal' ? t('paypalDesc') : method.id === 'gcash' ? t('gcashDesc') : method.id === 'wise' ? t('wiseDesc') : t('bybitDesc')}
                </div>
              </div>

              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                  selected
                    ? 'border-[#c9aa68] bg-[#c9aa68] text-[#0a0b0d]'
                    : 'border-[#3b414b]'
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

            <div className="text-sm font-bold text-[#eee9df]">
              {data.paymentMethod === 'gcash' &&
                `GCash ${t('paymentDetails')}`}

              {data.paymentMethod === 'paypal' &&
                `PayPal ${t('paypalCheckout')}`}

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

              <p className="text-center text-xs text-[#77746e]">
                {t('scanGcash')}
              </p>

              <div className="flex flex-col gap-2 rounded-xl bg-[#111318] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#77746e]">
                    {t('accountName')}
                  </span>

                  <span className="text-sm font-medium text-[#eee9df]">
                    {PAYMENT_INFO.gcash.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#77746e]">
                    {t('accountNumber')}
                  </span>

                  <span className="font-mono text-sm font-medium text-[#eee9df]">
                    {PAYMENT_INFO.gcash.number}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* PayPal */}
          {data.paymentMethod === 'paypal' && (
            <>
              <div className="rounded-xl border border-[#d3ad62]/40 bg-[#d3ad62]/5 p-4">
                <div className="flex gap-3">
                  <PayPalIcon size={40} />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-bold text-[#d3ad62]">
                      PayPal Secure Checkout
                    </div>
                    <p className="text-xs leading-relaxed text-[#d1d5db]">
                      Your PlayCrows Username, Character Name, package, and exact USD amount are passed automatically from the Donation Center. No need to enter them again.
                    </p>
                  </div>
                </div>
              </div>

              <PayPalCheckout
                data={data}
                selectedPackageId={selectedPackageId}
                promoCode={appliedPromoCode}
                onCompleted={completePayPalPayment}
              />

              <p className="text-center text-xs leading-relaxed text-[#77746e]">
                After PayPal confirms the payment, you will automatically continue to the receipt step. Please save your PayPal receipt for verification.
              </p>
            </>
          )}

{/* Wise */}
{data.paymentMethod === 'wise' && (
  <>
    <div className="mx-auto h-48 w-48 overflow-hidden rounded-xl border border-[#c9aa68]/40 bg-white p-2">
      <img
        src={wiseQr}
        alt="Wise payment QR code"
        className="h-full w-full object-contain"
      />
    </div>

    <p className="text-center text-xs leading-5 text-[#77746e]">
      {t('scanWise')}
    </p>

    <div className="flex flex-col gap-0 overflow-hidden rounded-xl bg-[#111318]">
      <PaymentDetailRow label={t('accountName')} value={PAYMENT_INFO.wise.accountName} mono />
      <PaymentDetailRow label={t('wisetag')} value={PAYMENT_INFO.wise.wisetag} mono />
    </div>

    <a
      href={PAYMENT_INFO.wise.link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#c9aa68] bg-[#c9aa68] px-4 py-2 text-sm font-bold text-[#16120b] transition-colors hover:bg-[#e1c88d]"
    >
      <WiseIcon size={18} />
      {t('openWise')}
    </a>

    <p className="text-center text-xs leading-5 text-[#77746e]">
      {t('saveScreenshotNext')}
    </p>
  </>
)}

          {/* Bybit */}
          {data.paymentMethod === 'bybit' && (
            <>
              <div className="rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 p-4">
                <div className="text-sm font-bold text-[#c9aa68]">
                  {t('chooseBybitMethod')}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#a8b2c5]">
                  {t('bybitMethodDesc')}
                </p>
              </div>

              {/* Internal Transfer */}
              <div className="overflow-hidden rounded-xl border border-[#292d34] bg-[#111318]">
                <div className="border-b border-[#292d34] px-4 py-3">
                  <div className="text-sm font-bold text-[#eee9df]">
                    {t('bybitInternal')}
                  </div>

                  <div className="mt-1 text-xs text-[#77746e]">
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
                <div className="h-px flex-1 bg-[#292d34]" />

                <span className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
                  {t('or')}
                </span>

                <div className="h-px flex-1 bg-[#292d34]" />
              </div>

              {/* USDT Transfer */}
              <div className="overflow-hidden rounded-xl border border-[#292d34] bg-[#111318]">
                <div className="border-b border-[#292d34] px-4 py-3">
                  <div className="text-sm font-bold text-[#eee9df]">
                    {t('usdtOnchain')}
                  </div>

                  <div className="mt-1 text-xs text-[#77746e]">
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

              <p className="text-center text-xs leading-relaxed text-[#77746e]">
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
          disabled={!data.paymentMethod || (data.paymentMethod === 'paypal' && data.paypalPaymentStatus !== 'COMPLETED')}
        >
          {t('continueReceipt')}
        </Btn>
      </div>
    </div>
  )
}