import type { FormData, PaymentMethod } from '../../types'
import { PAYMENT_METHODS, PAYMENT_INFO, CURRENCY_META } from '../../constants'
import { displayAmount } from '../../utils'
import { Btn, Card } from '../ui'
import { CheckIcon, PayPalIcon, GCashIcon, WiseIcon } from '../icons'
import gcashQr from '../../assets/gcash-qr.jpg'

function MethodIcon({ id, size = 36 }: { id: PaymentMethod; size?: number }) {
  if (id === 'paypal') return <PayPalIcon size={size} />
  if (id === 'gcash') return <GCashIcon size={size} />
  return <WiseIcon size={size} />
}

function GCashQR() {
  return (
    <div className="w-40 h-40 rounded-xl overflow-hidden mx-auto border border-[#252a38] bg-white p-2">
      <img src={gcashQr} alt="GCash QR code" className="w-full h-full object-cover" />
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
  const curMeta = CURRENCY_META[data.currency] ?? CURRENCY_META.USD

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">Choose Your Payment Method</h2>
        <p className="text-sm text-[#6b7280]">Select a method and follow the instructions to complete your payment.</p>
      </div>

      <Card className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-6 flex-wrap">
          <div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">Player ID</div>
            <div className="text-sm font-medium text-[#f5a623]">{data.playerId}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">Username</div>
            <div className="text-sm font-medium text-[#f5a623]">{data.username}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">Amount</div>
          <div className="text-lg font-bold text-[#e8eaf0]">{amtDisplay}</div>
          {data.currency !== 'USD' && (
            <div className="text-[10px] text-[#6b7280]">
              ≈ ${(parseFloat(data.amount === 'custom' ? data.customAmount : data.amount)).toFixed(2)} USD
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {PAYMENT_METHODS.map(m => {
          const selected = data.paymentMethod === m.id
          return (
            <button
              key={m.id}
              onClick={() => onUpdate({ paymentMethod: m.id })}
              className={
                `w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
                ${selected ? 'border-[#f5a623] bg-[#f5a623]/5' : 'border-[#252a38] bg-[#13161e] hover:border-[#353c52]'}`
              }
            >
              <MethodIcon id={m.id} size={36} />
              <div className="flex-1">
                <div className="font-semibold text-[#e8eaf0] text-sm">{m.label}</div>
                <div className="text-xs text-[#6b7280] mt-0.5">{m.desc}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${selected ? 'border-[#f5a623] bg-[#f5a623] text-[#0d0f14]' : 'border-[#353c52]'}`}>
                {selected && <CheckIcon size={10} />}
              </div>
            </button>
          )
        })}
      </div>

      {data.paymentMethod && (
        <Card className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <MethodIcon id={data.paymentMethod} size={28} />
            <div className="text-sm font-bold text-[#e8eaf0]">
              {data.paymentMethod === 'gcash' && 'GCash Payment Details'}
              {data.paymentMethod === 'paypal' && 'PayPal Payment Details'}
              {data.paymentMethod === 'wise' && 'Wise Payment Details'}
            </div>
          </div>

          {data.paymentMethod === 'gcash' && (
            <>
              <GCashQR />
              <p className="text-xs text-center text-[#6b7280]">Scan the QR code using your GCash app to complete your payment.</p>
              <div className="flex flex-col gap-2 bg-[#13161e] rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#6b7280]">Account Name</span>
                  <span className="text-sm font-medium text-[#e8eaf0]">{PAYMENT_INFO.gcash.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#6b7280]">Account Number</span>
                  <span className="text-sm font-medium text-[#e8eaf0] font-mono">{PAYMENT_INFO.gcash.number}</span>
                </div>
              </div>
            </>
          )}

          {data.paymentMethod === 'paypal' && (
            <>
              <div className="flex items-center gap-3 bg-[#13161e] rounded-xl p-4">
                <PayPalIcon size={40} />
                <div>
                  <div className="text-xs text-[#6b7280]">PayPal Email</div>
                  <div className="text-sm font-medium text-[#e8eaf0]">{PAYMENT_INFO.paypal.email}</div>
                </div>
              </div>
              <a href={PAYMENT_INFO.paypal.link} target="_blank" rel="noopener noreferrer" className="w-full">
                <Btn className="w-full"><PayPalIcon size={18} /> Pay with PayPal</Btn>
              </a>
            </>
          )}

          {data.paymentMethod === 'wise' && (
            <>
              <div className="flex flex-col gap-0 bg-[#13161e] rounded-xl overflow-hidden">
                {[
                  ['Account Name', PAYMENT_INFO.wise.accountName],
                  ['Wisetag', PAYMENT_INFO.wise.email]
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center px-4 py-3 border-b border-[#252a38] last:border-0">
                    <span className="text-xs text-[#6b7280]">{label}</span>
                    <span className="text-sm font-medium text-[#e8eaf0] font-mono">{val}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>Back</Btn>
        <Btn onClick={onNext} disabled={!data.paymentMethod}>Continue to Receipt</Btn>
      </div>
    </div>
  )
}
