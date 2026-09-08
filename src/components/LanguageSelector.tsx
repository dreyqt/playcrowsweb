import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useI18n } from '../i18n'

export function LanguageSelector() {
  const { language, setLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(item => item.code === language) ?? LANGUAGES[0]

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('touchstart', closeOnOutsideClick, { passive: true })
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('touchstart', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative z-[200] shrink-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex min-h-10 min-w-[112px] touch-manipulation items-center justify-between gap-2 rounded-lg border border-[#3b414b] bg-[#0f1115] px-3.5 py-2 text-xs font-bold text-[#eee9df] shadow-lg transition hover:border-[#c9aa68]/70 hover:bg-[#13161b] focus:outline-none focus:ring-2 focus:ring-[#c9aa68]/35"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[#c9aa68]" aria-hidden="true">◎</span>
          <span className="truncate">{current.label}</span>
        </span>
        <span
          className={`shrink-0 text-[9px] text-[#8f8b84] transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full z-[250] mt-1 w-[220px] overflow-hidden rounded-xl border border-[#313846] bg-[#0c111a] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
        >
          {LANGUAGES.map(item => {
            const active = item.code === language

            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLanguage(item.code)
                  setOpen(false)
                }}
                className={`flex min-h-11 w-full touch-manipulation items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#c9aa68]/30 ${
                  active
                    ? 'bg-[#18253a] text-[#e2bd6a]'
                    : 'text-[#d7d2c8] hover:bg-[#161d29] hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                <span className="ml-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#777f8d]">
                  {active ? '✓' : item.short}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
