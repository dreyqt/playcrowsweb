import { boostingAccessoryRewards, boostingWeaponRewards, getBoostingCumulativeValue } from '../giftPackageData'
import { useI18n } from '../i18n'
import type { PlayCrowsServer } from '../server'

interface BoostingBonusNoticeProps {
  server: PlayCrowsServer
  packageAmount?: number
  packageQuantity?: number
  compact?: boolean
}

/** Informational reward area. Actual bonus delivery is handled by PlayCrows support. */
export function BoostingBonusNotice({ server, packageAmount, packageQuantity = 1, compact = false }: BoostingBonusNoticeProps) {
  const { t } = useI18n()
  const showAccessories = packageAmount === undefined || packageAmount === 500
  const showWeapons = packageAmount === undefined || packageAmount === 1000
  const hasBonus = showAccessories || showWeapons

  if (!hasBonus && server !== 'v2') return null

  const bonuses = [
    ...(showAccessories ? [{ amount: 500, title: t('boostingAccessoryBonus'), rule: t('boostingAccessoryRule'), rewards: boostingAccessoryRewards }] : []),
    ...(showWeapons ? [{ amount: 1000, title: t('boostingWeaponBonus'), rule: t('boostingWeaponRule'), rewards: boostingWeaponRewards }] : []),
  ]

  return (
    <aside aria-label={t('boostingBonusTitle')} className="space-y-3">
      {server === 'v2' && (
        <div className="rounded-xl border border-[#a78bfa]/40 bg-[#8b5cf6]/10 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#c4b5fd]">{t('boostingCumulativeBadge')}</div>
          {packageAmount === undefined ? (
            <>
              <p className="mt-2 text-sm font-semibold text-[#f2eee6]">{t('boostingCumulativeRule')}</p>
              <p className="mt-1 text-sm text-[#c4b5fd]">{t('boostingCumulativeExample')}</p>
            </>
          ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-xl text-[#eee9df]">${getBoostingCumulativeValue(server, packageAmount, packageQuantity).toLocaleString('en-US')}</strong>
              <span className="text-sm text-[#c4b5fd]">{t('cumulativeValue')} · ${packageAmount.toLocaleString('en-US')} × {packageQuantity} × 2</span>
            </div>
          )}
        </div>
      )}
      {hasBonus && (
        <div className="rounded-xl border border-[#c9aa68]/40 bg-[#c9aa68]/5 p-4">
          <h4 className="text-sm font-bold text-[#f1d487]">{t('boostingBonusTitle')} · V1 &amp; V2</h4>
          <div className={`mt-3 grid gap-3 ${bonuses.length > 1 && !compact ? 'sm:grid-cols-2' : ''}`}>
            {bonuses.map(bonus => (
              <div key={bonus.amount} className="min-w-0 rounded-lg border border-[#c9aa68]/20 bg-[#111318] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#c9aa68]">${bonus.amount.toLocaleString('en-US')} {t('boostingPackage')}{packageAmount !== undefined && packageQuantity > 1 ? ` × ${packageQuantity}` : ''}</p>
                <p className="mt-1 text-sm font-bold text-[#eee9df]">{bonus.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#b9b3a8]">{bonus.rule}</p>
                <details className="mt-3" open={compact ? undefined : true}>
                  <summary className="cursor-pointer text-xs font-semibold text-[#f1d487]">{t('boostingBonusContents')}</summary>
                  <ul className="mt-2 space-y-2">
                    {bonus.rewards.map(reward => (
                      <li key={reward.name} className="flex items-start justify-between gap-3 text-xs leading-relaxed text-[#ddd6c9]">
                        <span>{reward.name}</span>
                        <strong className="shrink-0 text-[#f1d487]">×{((reward.quantity ?? 1) * packageQuantity).toLocaleString('en-US')}</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#b9b3a8]">{t('boostingPerPackageRule')}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8f8b84]">{t('boostingBonusNotice')}</p>
        </div>
      )}
    </aside>
  )
}
