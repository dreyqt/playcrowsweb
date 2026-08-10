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
        <h2 className="mb-2 text-2xl font-bold text-[#eee9df]">{t('supportAmountTitle')}</h2>
        <p className="text-sm text-[#77746e]">{t('supportAmountDesc')}</p>
      </div>

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#77746e]">{t('currency')}</div>
        <div className="flex gap-3">
          {(['USD', 'PHP', 'GBP'] as const).map(currency => {
            const meta = CURRENCY_META[currency]
            const selected = data.currency === currency
            return (
              <button type="button" key={currency} onClick={() => onUpdate({ currency })} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${selected ? 'border-[#d3ad62] bg-[#d3ad62]/5 text-[#d3ad62]' : 'border-[#292d34] bg-[#111318] text-[#77746e] hover:border-[#3b414b] hover:text-[#eee9df]'}`}>
                <span>{meta.symbol}</span><span>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Card className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8f8b84]">{t('selectedPackage')}</div>
        <div className="mt-2 text-lg font-bold text-[#eee9df]">{packageTitle}</div>
        <div className="mt-1 text-sm text-[#c9aa68]">${packageAmount.toLocaleString()} {t('each')}</div>

        <label className="mt-5 block">
          <span className="text-xs font-semibold text-[#aaa49a]">{t('quantity')}</span>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" aria-label={t('decreaseQuantity')} onClick={() => updateQuantity(String(Math.max(1, quantity - 1)))} className="h-11 w-11 rounded-lg border border-[#3b414b] bg-[#0d0f13] text-xl font-bold">−</button>
            <input type="number" min="1" max="999" inputMode="numeric" value={data.packageQuantity} onChange={event => updateQuantity(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 text-center text-lg font-bold text-[#eee9df] outline-none focus:border-[#c9aa68]" />
            <button type="button" aria-label={t('increaseQuantity')} onClick={() => updateQuantity(String(Math.min(999, quantity + 1)))} className="h-11 w-11 rounded-lg border border-[#3b414b] bg-[#0d0f13] text-xl font-bold">+</button>
          </div>
          <p className="mt-2 text-xs text-[#77746e]">{t('quantityExample')}</p>
        </label>

        <div className="mt-5 rounded-xl border border-[#c9aa68]/25 bg-[#c9aa68]/5 p-4">
          <div className="text-xs text-[#8f8b84]">{t('totalPayment')}</div>
          <div className="mt-1 text-2xl font-bold text-[#c9aa68]">{cur.symbol}{convertAmount(String(totalUsd), data.currency)}</div>
          {data.currency !== 'USD' && <div className="mt-1 text-xs text-[#8f8b84]">{t('usdEquivalent')}: ${totalUsd.toLocaleString()}</div>}
        </div>
      </Card>

      <Btn onClick={onNext} disabled={!valid}>{t('continue')}</Btn>
    </div>
  )
}
