import { useI18n } from '../i18n'

/** Informational event placeholder; eligibility and claims are not calculated here. */
export function HeroicBonusNotice({ septemberSelected = false, compact = false }: {
  septemberSelected?: boolean
  compact?: boolean
}) {
  const { t } = useI18n()

  return (
    <aside aria-label={t('heroicBonusTitle')} className="rounded-xl border border-[#c9aa68]/40 bg-[#c9aa68]/5 p-4 sm:p-5">
      <h3 className="text-base font-bold text-[#f1d487]">{t('heroicBonusTitle')}</h3>
      {compact ? (
        <p className="mt-2 text-sm leading-relaxed text-[#ddd6c9]">{t('heroicBonusSummary')}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
    </aside>
  )
}
