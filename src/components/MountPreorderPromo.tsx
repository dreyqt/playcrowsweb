import { useI18n } from '../i18n'
import type { MountPreorderCampaign } from '../lib/useMountPreorderCampaign'

export function MountPreorderPromo({ campaign, error, compact = false, onView }: {
  campaign: MountPreorderCampaign | null
  error: boolean
  compact?: boolean
  onView?: () => void
}) {
  const { t } = useI18n()
  const status = error ? t('mountPreorderStatusUnavailable')
    : !campaign ? t('mountPreorderBadge') : campaign.active ? t('mountPreorderActive') : t('mountPreorderComingSoon')
  return (
    <aside className={`rounded-xl border border-[#c9aa68]/30 bg-linear-to-r from-[#33271a]/50 to-[#111318] ${compact ? 'p-4' : 'mb-7 p-5 sm:p-6'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#d8b978]">{status}</p>
          <h2 className="mt-1 text-lg font-bold text-[#f3e5cb]">{t('mountPreorderTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bcb4a6]">{t(compact ? 'mountPreorderCheckoutNotice' : 'mountPreorderTeaser')}</p>
          {campaign?.active === false && <p className="mt-2 text-xs leading-5 text-[#d8b978]">{t('mountPreorderNotStarted')}</p>}
        </div>
        {onView && <button type="button" onClick={onView} className="min-h-11 shrink-0 rounded-lg border border-[#c9aa68]/60 bg-[#c9aa68]/10 px-4 py-2 text-sm font-semibold text-[#e4c98e] hover:bg-[#c9aa68]/20">{t('mountPreorderView')} <span aria-hidden="true">→</span></button>}
      </div>
    </aside>
  )
}
