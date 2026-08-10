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
        className="flex min-h-10 items-center gap-2 rounded-full border border-[#7f685e] bg-black/30 px-3 text-xs font-bold text-[#eadfd7] backdrop-blur transition hover:border-[#b76c45]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[#d08b5b]" aria-hidden="true">◎</span>
        <span>{current.short}</span>
        <span className={`text-[10px] text-[#7c879d] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-[calc(100%+8px)] z-[70] w-44 overflow-hidden rounded-sm border border-[#5a3c30] bg-[#0d0908]/95 shadow-2xl backdrop-blur"
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
                    ? 'bg-[#4b2118] text-[#e4aa78]'
                    : 'text-[#c7b8ae] hover:bg-[#261510] hover:text-white'
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
