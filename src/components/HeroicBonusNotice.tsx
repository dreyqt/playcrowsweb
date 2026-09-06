import { useId, useState } from 'react'
import { useI18n } from '../i18n'

/** Informational event placeholder; eligibility and claims are not calculated here. */
export function HeroicBonusNotice({ septemberSelected = false, compact = false }: {
  septemberSelected?: boolean
  compact?: boolean
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()

  return (
    <aside aria-label={t('heroicBonusTitle')} className="overflow-hidden rounded-xl border border-[#c9aa68]/40 bg-[#c9aa68]/5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#c9aa68]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c9aa68] sm:px-5"
        onClick={() => setExpanded(current => !current)}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <h3 className="text-base font-bold text-[#f1d487]">{t('heroicBonusTitle')}</h3>
        <span className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#c9aa68]">
          {t(expanded ? 'heroicBonusMinimize' : 'heroicBonusExpand')}
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div id={contentId} className="border-t border-[#c9aa68]/20 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          {compact ? (
            <p className="text-sm leading-relaxed text-[#ddd6c9]">{t('heroicBonusSummary')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#c9aa68]/20 bg-[#111318] p-4">
                <p className="text-sm font-semibold text-[#c9aa68]">{t('heroicBonusFirstThreshold')}</p>
                <p className="mt-1 text-base font-bold text-[#eee9df]">New Heroic Passive Skills</p>
                <p className="mt-2 text-sm leading-relaxed text-[#b9b3a8]">{t('heroicBonusFirstRule')}</p>
              </div>
              <div className="rounded-lg border border-[#c9aa68]/20 bg-[#111318] p-4">
                <p className="text-sm font-semibold text-[#c9aa68]">{t('heroicBonusSecondThreshold')}</p>
                <p className="mt-1 text-base font-bold text-[#eee9df]">Heroic Skill Enhancement II &amp; III</p>
                <p className="mt-2 text-sm leading-relaxed text-[#b9b3a8]">{t('heroicBonusSecondRule')}</p>
              </div>
            </div>
          )}
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#f1d487]">{t('heroicBonusOneTime')}</p>
          <p className={`mt-3 text-sm leading-relaxed ${septemberSelected ? 'font-semibold text-[#f1d487]' : 'text-[#b9b3a8]'}`}>
            {t(septemberSelected ? 'heroicBonusSeptemberSelected' : 'heroicBonusExclusion')}
          </p>
        </div>
      )}
    </aside>
  )
}
