import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useI18n } from '../i18n'

export function LanguageSelector() {
  const { language, setLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(item => item.code === language) ?? LANGUAGES[0]

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex min-h-10 items-center gap-2 rounded-lg border border-[#3b414b] bg-[#0f1115] px-3 text-xs font-bold text-[#eee9df] transition hover:border-[#c9aa68]/70"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[#c9aa68]" aria-hidden="true">◎</span>
        <span>{current.short}</span>
        <span className={`text-[10px] text-[#8f8b84] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-[calc(100%+8px)] z-[70] w-44 overflow-hidden rounded-lg border border-[#243044] bg-[#0c111a] shadow-2xl"
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
                className={`block w-full px-4 py-3 text-left text-sm transition ${
                  active
                    ? 'bg-[#102036] text-[#c9aa68]'
                    : 'text-[#d7d2c8] hover:bg-[#131b29] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
