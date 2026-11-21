import garudaWings from '../assets/garuda-of-eternity-wings.png'
import { useI18n } from '../i18n'

/** Describes the event; only verified purchases establish eligibility. */
export function DecemberBonusNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()

  return (
    <aside
      aria-label={t('decemberBonusTitle')}
      className="overflow-hidden rounded-2xl border border-[#c9aa68]/40 bg-[#111318] shadow-[0_12px_36px_rgba(0,0,0,0.22)]"
    >
      <div className={`grid ${compact ? 'sm:grid-cols-[170px_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'}`}>
        <div className="relative flex min-w-0 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(201,170,104,0.16),transparent_75%)]">
          <img
            src={garudaWings}
            alt={t('decemberBonusImageAlt')}
            width={885}
            height={640}
            loading="lazy"
            className={`relative block w-full object-contain ${compact ? 'max-h-44 p-3 sm:max-h-64 sm:p-2' : 'max-h-72 p-4 lg:max-h-96 lg:p-2'}`}
          />
        </div>
        <div className={`min-w-0 ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-7'}`}>
          <p className="text-[10px] font-black uppercase leading-5 tracking-[0.15em] text-[#c9aa68]">{t('decemberBonusEyebrow')}</p>
          <h3 className={`mt-2 font-bold leading-tight text-[#f5efe2] ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{t('decemberBonusTitle')}</h3>
          <p className="mt-4 inline-flex rounded-lg border border-[#c9aa68]/30 bg-[#c9aa68]/10 px-3 py-2 text-sm font-bold leading-5 text-[#f1d487]">{t('decemberBonusThreshold')}</p>
          <p className="mt-4 text-sm leading-6 text-[#ddd6c9]">{t('decemberBonusRule')}</p>
          <p className="mt-3 text-xs font-semibold leading-5 text-[#c9aa68]">{t('decemberBonusOnly')}</p>
          <p className="mt-2 text-xs leading-5 text-[#b9b3a8]">{t('decemberBonusValueRule')}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#f1d487]">{t('decemberBonusOnce')}</p>
          <p className="mt-2 text-xs leading-5 text-[#a9a39a]">{t('decemberBonusVerification')}</p>
        </div>
      </div>
    </aside>
  )
}
