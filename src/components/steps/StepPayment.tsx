import type { FormData, PaymentMethod } from '../../types'
import {
  PAYMENT_METHODS,
  PAYMENT_INFO,
  CURRENCY_META,
} from '../../constants'
import { displayAmount } from '../../utils'
import { Btn, Card } from '../ui'
import {
  CheckIcon,
  PayPalIcon,
  GCashIcon,
  WiseIcon,
} from '../icons'
import gcashQr from '../../assets/gcash-qr.jpg'
import bybitQr from '../../assets/bybit-qr.png'

function BybitIcon({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-lg border border-[#66d4ff]/40 bg-[#66d4ff]/10 font-black text-[#66d4ff]"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.38),
      }}
      aria-label="Bybit"
    >
      B
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

  if (id === 'bybit') {
    return <BybitIcon size={size} />
  }

  return <WiseIcon size={size} />
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
  onUpdate,
  onNext,
  onBack,
}: {
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const amtDisplay = displayAmount(data)
  const curMeta =
    CURRENCY_META[data.currency] ?? CURRENCY_META.USD

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">
          Choose Your Payment Method
        </h2>

        <p className="text-sm text-[#6b7280]">
          Select a method and follow the instructions to complete
          your payment.
        </p>
      </div>

      {/* Order Summary */}
      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
              Player ID
            </div>

            <div className="text-sm font-medium text-[#66d4ff]">
              {data.playerId}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
              Username
            </div>

            <div className="text-sm font-medium text-[#66d4ff]">
              {data.username}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
            Amount
          </div>

          <div className="text-lg font-bold text-[#e8eaf0]">
            {amtDisplay}
          </div>

          {data.currency !== 'USD' && (
            <div className="text-[10px] text-[#6b7280]">
              ≈ $
              {(
                parseFloat(
                  data.amount === 'custom'
                    ? data.customAmount
                    : data.amount
                ) / curMeta.rateFromUSD
              ).toFixed(2)}{' '}
              USD
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
                  {method.desc}
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
                'GCash Payment Details'}

              {data.paymentMethod === 'paypal' &&
                'PayPal Payment Details'}

              {data.paymentMethod === 'wise' &&
                'Wise Payment Details'}

              {data.paymentMethod === 'bybit' &&
                'Bybit Payment Details'}
            </div>
          </div>

          {/* GCash */}
          {data.paymentMethod === 'gcash' && (
            <>
              <GCashQR />

              <p className="text-center text-xs text-[#6b7280]">
                Scan the QR code using your GCash app to complete
                your payment.
              </p>

              <div className="flex flex-col gap-2 rounded-xl bg-[#13161e] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">
                    Account Name
                  </span>

                  <span className="text-sm font-medium text-[#e8eaf0]">
                    {PAYMENT_INFO.gcash.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">
                    Account Number
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
                      Important PayPal Payment Instructions
                    </div>

                    <p className="text-xs leading-relaxed text-[#d1d5db]">
                      When sending your payment through PayPal,
                      please select
                      <span className="font-bold text-[#f5a623]">
                        {' '}
                        Friends and Family
                      </span>{' '}
                      if this option is available to you.
                    </p>

                    <p className="text-xs leading-relaxed text-[#6b7280]">
                      Please make sure the payment is sent using the
                      correct payment type before completing the
                      transaction.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#13161e] p-4">
                <PayPalIcon size={40} />

                <div>
                  <div className="text-xs text-[#6b7280]">
                    PayPal Email
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
                  Open PayPal
                </Btn>
              </a>
            </>
          )}

          {/* Wise */}
          {data.paymentMethod === 'wise' && (
            <div className="flex flex-col gap-0 overflow-hidden rounded-xl bg-[#13161e]">
              {[
                [
                  'Account Name',
                  PAYMENT_INFO.wise.accountName,
                ],
                [
                  'Wisetag',
                  PAYMENT_INFO.wise.email,
                ],
              ].map(([label, value]) => (
                <PaymentDetailRow
                  key={label}
                  label={label}
                  value={value}
                  mono
                />
              ))}
            </div>
          )}

          {/* Bybit */}
          {data.paymentMethod === 'bybit' && (
            <>
              <div className="rounded-xl border border-[#66d4ff]/30 bg-[#66d4ff]/5 p-4">
                <div className="text-sm font-bold text-[#66d4ff]">
                  Choose one Bybit transfer method
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#a8b2c5]">
                  You may send through an internal Bybit UID transfer,
                  or send USDT through the TRC20 network.
                </p>
              </div>

              {/* Internal Transfer */}
              <div className="overflow-hidden rounded-xl border border-[#252a38] bg-[#13161e]">
                <div className="border-b border-[#252a38] px-4 py-3">
                  <div className="text-sm font-bold text-[#e8eaf0]">
                    Bybit Internal Transfer
                  </div>

                  <div className="mt-1 text-xs text-[#6b7280]">
                    Use this UID when transferring from another Bybit
                    account.
                  </div>
                </div>

                <PaymentDetailRow
                  label="Bybit UID"
                  value={PAYMENT_INFO.bybit.uid}
                  mono
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#252a38]" />

                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                  Or
                </span>

                <div className="h-px flex-1 bg-[#252a38]" />
              </div>

              {/* USDT Transfer */}
              <div className="overflow-hidden rounded-xl border border-[#252a38] bg-[#13161e]">
                <div className="border-b border-[#252a38] px-4 py-3">
                  <div className="text-sm font-bold text-[#e8eaf0]">
                    USDT On-Chain Transfer
                  </div>

                  <div className="mt-1 text-xs text-[#6b7280]">
                    Scan the QR code or enter the wallet address
                    manually.
                  </div>
                </div>

                <div className="p-5">
                  <BybitQR />
                </div>

                <PaymentDetailRow
                  label="Asset"
                  value={PAYMENT_INFO.bybit.asset}
                />

                <PaymentDetailRow
                  label="Network"
                  value={PAYMENT_INFO.bybit.network}
                />

                <PaymentDetailRow
                  label="Wallet Address"
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
                      Important network warning
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-[#c8cfda]">
                      Send only USDT using the TRC20 network. Using a
                      different asset or network may result in
                      permanent loss of funds.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs leading-relaxed text-[#6b7280]">
                After completing the transfer, save a screenshot of
                the transaction receipt and upload it in the next
                step.
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
          Back
        </Btn>

        <Btn
          onClick={onNext}
          disabled={!data.paymentMethod}
        >
          Continue to Receipt
        </Btn>
      </div>
    </div>
  )
}