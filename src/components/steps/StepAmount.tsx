import type { FormData } from '../../types'
import { PRESET_AMOUNTS_USD, CURRENCY_META } from '../../constants'
import { convertAmount } from '../../utils'
import { Btn } from '../ui'

/**
 * Dias rewards for each package.
 *
 * $10   = 10,000 Dias
 * $50   = 210,000 Dias
 * $100  = 450,000 Dias
 * $200  = 1,000,000 Dias
 * $500  = 3,000,000 Dias
 * $1000 = 8,000,000 Dias
 */
const PACKAGE_REWARDS = [
  { amount: 1000, dias: 8000000 },
  { amount: 500, dias: 3000000 },
  { amount: 200, dias: 1000000 },
  { amount: 100, dias: 450000 },
  { amount: 50, dias: 210000 },
  { amount: 10, dias: 10000 },
  { amount: 5, dias: 20000 },
]

/**
 * Dias displayed under each preset package.
 */
const DIAMONDS_BY_USD: Record<string, string> = {
  '5': '20,000',
  '10': '10,000',
  '50': '210,000',
  '100': '450,000',
  '200': '1,000,000',
  '500': '3,000,000',
  '1000': '8,000,000',
}

/**
 * Calculate the Dias and package breakdown
 * for a custom USD amount.
 *
 * Example:
 *
 * $280
 * $200 x 1 = 1,000,000 Dias
 * $50  x 1 = 210,000 Dias
 * $10  x 3 = 30,000 Dias
 *
 * Total = 1,240,000 Dias
 */
const calculateCustomReward = (usdAmount: number) => {
  let remaining = Math.floor(usdAmount)
  let totalDias = 0

  const breakdown: {
    amount: number
    dias: number
    quantity: number
  }[] = []

  for (const pkg of PACKAGE_REWARDS) {
    const quantity = Math.floor(remaining / pkg.amount)

    if (quantity > 0) {
      totalDias += quantity * pkg.dias
      remaining -= quantity * pkg.amount

      breakdown.push({
        amount: pkg.amount,
        dias: pkg.dias,
        quantity,
      })
    }
  }

  return {
    totalDias,
    breakdown,
    remaining,
  }
}

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

  const valid =
    data.amount &&
    (data.amount !== 'custom' || data.customAmount.trim())

  /**
   * Convert a USD package amount to the
   * currently selected currency.
   */
  const getDisplayLabel = (usdAmt: string) => {
    const converted = convertAmount(usdAmt, data.currency)

    return `${cur.symbol}${converted}`
  }

  /**
   * Convert custom amount into USD.
   *
   * Example:
   *
   * USD:
   * $280 = $280 USD
   *
   * PHP:
   * ₱16,800 / 60 = $280 USD
   *
   * GBP:
   * £221.20 / 0.79 = $280 USD
   */
  const getCustomUsdAmount = () => {
    if (
      !data.customAmount ||
      isNaN(parseFloat(data.customAmount))
    ) {
      return null
    }

    const customAmount = parseFloat(data.customAmount)

    const usdAmount =
      data.currency === 'USD'
        ? customAmount
        : customAmount / cur.rateFromUSD

    return usdAmount
  }

  /**
   * Get custom Dias reward.
   */
  const getCustomReward = () => {
    const usdAmount = getCustomUsdAmount()

    if (usdAmount === null) {
      return null
    }

    return calculateCustomReward(usdAmount)
  }

  const customReward = isCustom
    ? getCustomReward()
    : null

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">
          Select Your Support Amount
        </h2>

        <p className="text-sm text-[#6b7280]">
          Choose your currency and how much you would like to contribute.
        </p>
      </div>


      {/* Currency Selection */}
      <div>
        <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest mb-3">
          Currency
        </div>

        <div className="flex gap-3">

          {(['USD', 'PHP', 'GBP'] as const).map(c => {
            const m = CURRENCY_META[c]

            const selected =
              data.currency === c

            return (
              <button
                key={c}
                onClick={() =>
                  onUpdate({
                    currency: c,
                    amount: '',
                    customAmount: '',
                  })
                }
                className={
                  `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer
                  ${
                    selected
                      ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]'
                      : 'border-[#252a38] bg-[#13161e] text-[#6b7280] hover:border-[#353c52] hover:text-[#e8eaf0]'
                  }`
                }
              >
                <span className="text-base">
                  {m.symbol}
                </span>

                <span>
                  {m.label}
                </span>
              </button>
            )
          })}

        </div>


        {/* PHP Exchange Rate */}
        {data.currency === 'PHP' && (
          <p className="mt-2 text-xs text-[#6b7280]">
            Exchange rate:{' '}
            <span className="text-[#f5a623] font-semibold">
              $1 = ₱60
            </span>
          </p>
        )}


        {/* GBP Exchange Rate */}
        {data.currency === 'GBP' && (
          <p className="mt-2 text-xs text-[#6b7280]">
            Exchange rate:{' '}
            <span className="text-[#f5a623] font-semibold">
              $1 = £0.79
            </span>
          </p>
        )}

      </div>


      {/* Preset Amounts */}
      <div className="grid grid-cols-3 gap-3">

        {PRESET_AMOUNTS_USD.map(amt => (

          <button
            key={amt}
            onClick={() =>
              onUpdate({
                amount: amt,
                customAmount: '',
              })
            }
            className={
              `py-4 rounded-xl border font-bold text-sm transition-all duration-200 cursor-pointer flex flex-col items-center gap-1
              ${
                data.amount === amt
                  ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]'
                  : 'border-[#252a38] bg-[#13161e] text-[#e8eaf0] hover:border-[#353c52]'
              }`
            }
          >

            {/* Price */}
            <span className="text-base font-bold">
              {getDisplayLabel(amt)}
            </span>


            {/* Dias */}
            <span className="text-xs text-[#f5a623] font-semibold">
              {DIAMONDS_BY_USD[amt]} Dias
            </span>


            {/* USD Equivalent */}
            {data.currency !== 'USD' && (
              <span className="text-[10px] text-[#6b7280] font-normal">
                ${parseInt(amt, 10).toLocaleString()} USD
              </span>
            )}

          </button>

        ))}


        {/* Custom Amount Button */}
        <button
          onClick={() =>
            onUpdate({
              amount: 'custom',
              customAmount: '',
            })
          }
          className={
            `col-span-3 py-3 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer
            ${
              isCustom
                ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]'
                : 'border-[#252a38] bg-[#13161e] text-[#6b7280] hover:border-[#353c52]'
            }`
          }
        >
          Custom Amount
        </button>

      </div>


      {/* Custom Amount Input */}
      {isCustom && (

        <div className="flex flex-col gap-3">

          {/* Input */}
          <div className="flex items-center gap-3 bg-[#13161e] border border-[#f5a623] rounded-xl px-4 py-3">

            <span className="text-[#f5a623] font-bold text-lg">
              {cur.symbol}
            </span>

            <input
              type="number"
              min="1"
              step="1"
              placeholder={`Enter amount in ${cur.label}`}
              value={data.customAmount}
              onChange={e =>
                onUpdate({
                  customAmount: e.target.value,
                })
              }
              className="flex-1 bg-transparent text-[#e8eaf0] placeholder-[#6b7280] text-base font-semibold outline-none"
            />

          </div>


          {/* Custom Reward Preview */}
          {customReward && (
            <div className="bg-[#13161e] border border-[#252a38] rounded-xl p-4">

              {/* Estimated Reward Header */}
              <div className="flex items-center justify-between mb-3">

                <span className="text-xs text-[#6b7280]">
                  Estimated Reward
                </span>

                <span className="text-lg text-[#f5a623] font-bold">
                  {customReward.totalDias.toLocaleString()} Dias
                </span>

              </div>


              {/* Package Breakdown */}
              {customReward.breakdown.length > 0 && (

                <div className="flex flex-col gap-2">

                  <p className="text-xs text-[#6b7280]">
                    Package breakdown:
                  </p>

                  {customReward.breakdown.map(pkg => (

                    <div
                      key={pkg.amount}
                      className="flex items-center justify-between text-xs"
                    >

                      <span className="text-[#e8eaf0]">
                        ${pkg.amount.toLocaleString()} Package
                        {' × '}
                        {pkg.quantity}
                      </span>

                      <span className="text-[#f5a623] font-semibold">
                        {(pkg.dias * pkg.quantity).toLocaleString()} Dias
                      </span>

                    </div>

                  ))}

                </div>

              )}


              {/* Remaining Amount */}
              {customReward.remaining > 0 && (

                <p className="text-[10px] text-[#6b7280] mt-3">
                  Note: ${customReward.remaining.toFixed(2)} cannot be matched to an available package.
                </p>

              )}

            </div>
          )}


          {/* USD Equivalent */}
          {data.currency !== 'USD' &&
            data.customAmount &&
            getCustomUsdAmount() !== null && (

              <p className="text-xs text-[#6b7280] pl-1">
                ≈ $
                {getCustomUsdAmount()!.toFixed(2)} USD
              </p>

          )}

        </div>

      )}


      {/* Support Message */}
      <p className="text-xs text-[#6b7280] leading-relaxed border-l-2 border-[#f5a623] pl-4">
        Every contribution helps support Playcrows by Hawk and helps us continue improving the server and community. Thank you for your support!
      </p>


      {/* Continue Button */}
      <div className="flex justify-end">

        <Btn
          onClick={onNext}
          disabled={!valid}
        >
          Continue
        </Btn>

      </div>

    </div>
  )
}