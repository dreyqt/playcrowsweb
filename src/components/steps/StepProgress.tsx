import { STEPS } from '../../constants'
import { CheckIcon } from '../icons'

export function StepProgress({ current }: { current: number }) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-10 px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-px bg-[#252a38]" />
        <div
          className="absolute top-4 left-0 h-px bg-[#f5a623] transition-all duration-500"
          style={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((label, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <div key={label} className="relative flex flex-col items-center gap-2 z-10">
              <div
                className={
                  `
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                  ${done ? 'bg-[#f5a623] text-[#0d0f14]' : active ? 'bg-[#f5a623] text-[#0d0f14] ring-4 ring-[#f5a623]/20' : 'bg-[#191d27] border border-[#252a38] text-[#6b7280]'}
                `}
              >
                {done ? <CheckIcon size={14} /> : step}
              </div>
              <span className={`text-[10px] font-medium tracking-wide hidden sm:block ${active ? 'text-[#f5a623]' : done ? 'text-[#e8eaf0]' : 'text-[#6b7280]'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
