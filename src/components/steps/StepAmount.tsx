import type { FormData } from '../../types'
import { PRESET_AMOUNTS_USD, CURRENCY_META } from '../../constants'
import { convertAmount } from '../../utils'
import { Btn, Card, Input } from '../ui'

export function StepAmount({
  data,
  onUpdate,
  onNext,
}: {
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
}) {
  const cur = CURRENCY_META[data.currency]
  const isCustom = data.amount === 'custom'
  const valid = data.amount && (data.amount !== 'custom' || data.customAmount.trim())

  const getDisplayLabel = (usdAmt: string) => {
    const converted = convertAmount(usdAmt, data.currency)
    return `${cur.symbol}${converted}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">Select Your Support Amount</h2>
        <p className="text-sm text-[#6b7280]">Choose your currency and how much you would like to contribute.</p>
      </div>

      <div>
        <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest mb-3">Currency</div>
        <div className="flex gap-3">
          {(['USD', 'PHP', 'GBP'] as const).map(c => {
            const m = CURRENCY_META[c]
            const selected = data.currency === c
            return (
              <button
                key={c}
                onClick={() => onUpdate({ currency: c, amount: '', customAmount: '' })}
                className={
                  `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer
                  ${selected ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]' : 'border-[#252a38] bg-[#13161e] text-[#6b7280] hover:border-[#353c52] hover:text-[#e8eaf0]'}`
                }
              >
                <span className="text-base">{m.symbol}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
        {data.currency === 'PHP' && (
          <p className="mt-2 text-xs text-[#6b7280]">
            Exchange rate: <span className="text-[#f5a623] font-semibold">$1 = ₱60</span>
          </p>
        )}
        {data.currency === 'GBP' && (
          <p className="mt-2 text-xs text-[#6b7280]">
            Exchange rate: <span className="text-[#f5a623] font-semibold">$1 = £0.79</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PRESET_AMOUNTS_USD.map(amt => (
          <button
            key={amt}
            onClick={() => onUpdate({ amount: amt, customAmount: '' })}
            className={
              `py-4 rounded-xl border font-bold text-sm transition-all duration-200 cursor-pointer flex flex-col items-center gap-0.5
              ${data.amount === amt
                ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]'
                : 'border-[#252a38] bg-[#13161e] text-[#e8eaf0] hover:border-[#353c52]'}`
            }
          >
            <span className="text-base font-bold">{getDisplayLabel(amt)}</span>
            {data.currency !== 'USD' && (
              <span className="text-[10px] text-[#6b7280] font-normal">${parseInt(amt, 10).toLocaleString()} USD</span>
            )}
          </button>
        ))}
        <button
          onClick={() => onUpdate({ amount: 'custom' })}
          className={
            `col-span-3 py-3 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer
            ${isCustom ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]' : 'border-[#252a38] bg-[#13161e] text-[#6b7280] hover:border-[#353c52]'}`
          }
        >
          Custom Amount
        </button>
      </div>

      {isCustom && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-[#13161e] border border-[#f5a623] rounded-xl px-4 py-3">
            <span className="text-[#f5a623] font-bold text-lg">{cur.symbol}</span>
            <input
              type="number"
              min="1"
              placeholder={`Enter amount in ${cur.label}`}
              value={data.customAmount}
              onChange={e => onUpdate({ customAmount: e.target.value })}
              className="flex-1 bg-transparent text-[#e8eaf0] placeholder-[#6b7280] text-base font-semibold outline-none"
            />
          </div>
          {data.currency !== 'USD' && data.customAmount && (
            <p className="text-xs text-[#6b7280] pl-1">
              ≈ ${(parseFloat(data.customAmount) / cur.rateFromUSD).toFixed(2)} USD
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-[#6b7280] leading-relaxed border-l-2 border-[#f5a623] pl-4">
        Every contribution helps support Playcrows by Hawk and helps us continue improving the server and community. Thank you for your support!
      </p>

      <div className="flex justify-end">
        <Btn onClick={onNext} disabled={!valid}>Continue</Btn>
      </div>
    </div>
  )
}
