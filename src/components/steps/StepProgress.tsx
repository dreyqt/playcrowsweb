import { CheckIcon } from '../icons'
import { useI18n } from '../../i18n'

export function StepProgress({ current }: { current: number }) {
  const { t } = useI18n()
  const steps = [t('stepAmount'), t('stepPlayerInfo'), t('stepPayment'), t('stepReceipt'), t('stepComplete')]

  return (
    <section className="pc-progress">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#b89657]">
            Checkout Progress
          </div>
          <div className="mt-1 text-sm font-semibold text-[#ede5d9]">
            Step {current} of {steps.length}
          </div>
        </div>
        <div className="text-xs text-[#777168]">{steps[current - 1]}</div>
      </div>

      <div className="relative">
        <div className="absolute left-4 right-4 top-4 h-px bg-[#2a2722]" />
        <div
          className="absolute left-4 top-4 h-px bg-gradient-to-r from-[#b98743] to-[#e0bf77] transition-all duration-500"
          style={{ width: `calc(${((current - 1) / (steps.length - 1)) * 100}% - 2rem)` }}
        />
        <div className="relative z-10 grid grid-cols-5">
          {steps.map((label, i) => {
            const step = i + 1
            const done = step < current
            const active = step === current
            return (
              <div key={`${i}-${label}`} className="flex flex-col items-center gap-2">
                <div className={`pc-step-dot ${done ? 'pc-step-dot--done' : active ? 'pc-step-dot--active' : ''}`}>
                  {done ? <CheckIcon size={13} /> : step}
                </div>
                <span className={`hidden text-center text-[9px] font-semibold sm:block ${active ? 'text-[#d7b06a]' : done ? 'text-[#c9c1b5]' : 'text-[#68635c]'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
