import type { FormData } from '../../types'
import { CURRENCY_META } from '../../constants'
import { convertAmount } from '../../utils'
import { useI18n } from '../../i18n'
import { Btn, Card } from '../ui'

export function StepAmount({ data, packageAmount, packageTitle, onUpdate, onNext }: {
  data: FormData
  packageAmount: number
  packageTitle: string
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
}) {
  const { t } = useI18n()
  const quantity = Math.max(0, Math.floor(Number(data.packageQuantity) || 0))
  const totalUsd = packageAmount * quantity
  const cur = CURRENCY_META[data.currency]
  const valid = quantity >= 1 && quantity <= 999

  const updateQuantity = (value: string) => {
    const normalized = value.replace(/[^0-9]/g, '').slice(0, 3)
    const nextQuantity = Number(normalized)
    onUpdate({
      packageQuantity: normalized,
      amount: normalized && nextQuantity > 0 ? String(packageAmount * nextQuantity) : '',
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">{t('supportAmountTitle')}</h2>
        <p className="text-sm text-[#6b7280]">{t('supportAmountDesc')}</p>
      </div>

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">{t('currency')}</div>
        <div className="flex gap-3">
          {(['USD', 'PHP', 'GBP'] as const).map(currency => {
            const meta = CURRENCY_META[currency]
            const selected = data.currency === currency
            return (
              <button type="button" key={currency} onClick={() => onUpdate({ currency })} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${selected ? 'border-[#f5a623] bg-[#f5a623]/5 text-[#f5a623]' : 'border-[#252a38] bg-[#13161e] text-[#6b7280] hover:border-[#353c52] hover:text-[#e8eaf0]'}`}>
                <span>{meta.symbol}</span><span>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Card className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#7c879d]">{t('selectedPackage')}</div>
        <div className="mt-2 text-lg font-bold text-[#e8eaf0]">{packageTitle}</div>
        <div className="mt-1 text-sm text-[#66d4ff]">${packageAmount.toLocaleString()} {t('each')}</div>

        <label className="mt-5 block">
          <span className="text-xs font-semibold text-[#9aa6ba]">{t('quantity')}</span>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" aria-label={t('decreaseQuantity')} onClick={() => updateQuantity(String(Math.max(1, quantity - 1)))} className="h-11 w-11 rounded-lg border border-[#353c52] bg-[#0f1219] text-xl font-bold">−</button>
            <input type="number" min="1" max="999" inputMode="numeric" value={data.packageQuantity} onChange={event => updateQuantity(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-[#353c52] bg-[#0f1219] px-3 text-center text-lg font-bold text-[#e8eaf0] outline-none focus:border-[#66d4ff]" />
            <button type="button" aria-label={t('increaseQuantity')} onClick={() => updateQuantity(String(Math.min(999, quantity + 1)))} className="h-11 w-11 rounded-lg border border-[#353c52] bg-[#0f1219] text-xl font-bold">+</button>
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">{t('quantityExample')}</p>
        </label>

        <div className="mt-5 rounded-xl border border-[#66d4ff]/25 bg-[#66d4ff]/5 p-4">
          <div className="text-xs text-[#7c879d]">{t('totalPayment')}</div>
          <div className="mt-1 text-2xl font-bold text-[#66d4ff]">{cur.symbol}{convertAmount(String(totalUsd), data.currency)}</div>
          {data.currency !== 'USD' && <div className="mt-1 text-xs text-[#7c879d]">{t('usdEquivalent')}: ${totalUsd.toLocaleString()}</div>}
        </div>
      </Card>

      <Btn onClick={onNext} disabled={!valid}>{t('continue')}</Btn>
    </div>
  )
}
