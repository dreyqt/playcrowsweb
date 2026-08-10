import { CheckIcon } from '../icons'
import { useI18n } from '../../i18n'

export function StepProgress({ current }: { current: number }) {
  const { t } = useI18n()
  const steps = [t('stepAmount'), t('stepPlayerInfo'), t('stepPayment'), t('stepReceipt'), t('stepComplete')]

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-px bg-[#292d34]" />
        <div
          className="absolute top-4 left-0 h-px bg-[#d3ad62] transition-all duration-500"
          style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((label, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <div key={`${i}-${label}`} className="relative flex flex-col items-center gap-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${done ? 'bg-[#d3ad62] text-[#0a0b0d]' : active ? 'bg-[#d3ad62] text-[#0a0b0d] ring-4 ring-[#d3ad62]/20' : 'bg-[#171a20] border border-[#292d34] text-[#77746e]'}`}>
                {done ? <CheckIcon size={14} /> : step}
              </div>
              <span className={`text-[10px] font-medium tracking-wide hidden sm:block ${active ? 'text-[#d3ad62]' : done ? 'text-[#eee9df]' : 'text-[#77746e]'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
