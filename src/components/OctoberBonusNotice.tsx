import { useI18n } from '../i18n'

/** Describes the promotion; payment approval and mount delivery remain subject to review. */
export function OctoberBonusNotice() {
  const { t } = useI18n()

  return (
    <aside aria-label={t('octoberBonusTitle')} className="rounded-xl border border-[#d66cff]/40 bg-[#d66cff]/5 p-4 sm:p-5">
      <h3 className="text-base font-bold text-[#e4a7ff]">{t('octoberBonusTitle')}</h3>
      <p className="mt-2 text-sm font-semibold text-[#f1d487]">{t('octoberBonusPackages')}</p>
      <p className="mt-1 text-lg font-bold text-[#f5efe2]">{t('newMount')}: The White Tiger of Manouille I</p>
      <p className="mt-2 text-sm leading-relaxed text-[#ddd6c9]">{t('octoberBonusRule')}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#e4a7ff]">{t('octoberBonusOnly')}</p>
    </aside>
  )
}
