import { CheckIcon } from '../icons'
import { useI18n } from '../../i18n'
import { useBonusI18n } from '../../bonusI18n'
import type { PaymentMethod } from '../../types'

export function StepProgress({ current, paymentMethod }: { current: number; paymentMethod: PaymentMethod | null }) {
  const { t } = useI18n()
  const { t: bonusText } = useBonusI18n()
  const steps = [
    { id: 1, label: t('stepAmount') },
    { id: 2, label: t('stepPlayerInfo') },
    { id: 3, label: t('stepPayment') },
    ...(paymentMethod === 'paypal' ? [] : [{ id: 4, label: t('stepReceipt') }]),
    { id: 5, label: bonusText('stepBonus') },
    { id: 6, label: bonusText('stepReview') },
  ]
  const currentIndex = Math.max(0, steps.findIndex(step => step.id === current))

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-px bg-[#292d34]" />
        <div
          className="absolute top-4 left-0 h-px bg-[#d3ad62] transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
        {steps.map(({ id, label }, i) => {
          const done = id < current
          const active = id === current
          return (
            <div key={id} aria-current={active ? 'step' : undefined} className="relative flex flex-col items-center gap-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${done ? 'bg-[#d3ad62] text-[#0a0b0d]' : active ? 'bg-[#d3ad62] text-[#0a0b0d] ring-4 ring-[#d3ad62]/20' : 'bg-[#171a20] border border-[#292d34] text-[#77746e]'}`}>
                {done ? <CheckIcon size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium tracking-wide hidden sm:block ${active ? 'text-[#d3ad62]' : done ? 'text-[#eee9df]' : 'text-[#77746e]'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-[#d3ad62] sm:hidden">
        {currentIndex + 1} / {steps.length} · {steps[currentIndex].label}
      </p>
    </div>
  )
}
