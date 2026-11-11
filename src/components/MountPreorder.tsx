import { useI18n } from '../i18n'
import { MOUNT_PREORDER_STEPS, MOUNT_PREORDER_TOTAL } from '../mountPreorderData'

interface MountPreorderProps {
  onBrowsePackages?: () => void
  campaignActive?: boolean | null
}

const dollars = (amount: number) => `$${amount.toLocaleString('en-US')}`

export function MountPreorder({ onBrowsePackages, campaignActive = false }: MountPreorderProps) {
  const { t } = useI18n()

  return (
    <section aria-labelledby="mount-preorder-title" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#c9aa68]/25 bg-[#111318] px-5 py-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-40 h-96 w-96 rounded-full bg-[#c9aa68]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9aa68]/25 bg-[#c9aa68]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#e7c985]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#e7c985]" />
              {campaignActive === null ? t('mountPreorderBadge') : campaignActive ? t('mountPreorderActive') : t('mountPreorderComingSoon')}
            </span>
            <h2 id="mount-preorder-title" className="mt-4 text-3xl font-black tracking-tight text-[#fff5df] sm:text-4xl">{t('mountPreorderTitle')}</h2>
            <p className="mt-3 text-base leading-relaxed text-[#e4d9c6]">{t('mountPreorderIntro')}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#a8a29a]">{t('mountPreorderGiftContents')}</p>
            {campaignActive === false && <p className="mt-4 rounded-lg border border-[#c9aa68]/25 bg-[#c9aa68]/5 px-3 py-2 text-xs leading-relaxed text-[#f1d487]">{t('mountPreorderNotStarted')}</p>}
          </div>
          <div className="shrink-0 rounded-xl border border-[#c9aa68]/20 bg-black/20 px-6 py-5 lg:max-w-[240px]">
            <p className="text-xs font-semibold text-[#d4c4a5]">{t('mountPreorderAllThree')}</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-[#f3d492]">{dollars(MOUNT_PREORDER_TOTAL)}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#a8a29a]">{t('mountPreorderTotalSpend')}</p>
          </div>
        </div>
      </div>

      <ol className="grid items-start gap-5 lg:grid-cols-3">
        {MOUNT_PREORDER_STEPS.map((mount, index) => (
          <li key={mount.id} className="min-w-0">
            <article aria-labelledby={`${mount.id}-title`} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
              <div className="relative aspect-[1.22] overflow-hidden bg-[#0a0b0d]">
                {/* The original screenshots contain old stats on the left. This viewport shows only the mount artwork. */}
                <img src={mount.image} alt={mount.name} loading="lazy" className="absolute right-0 top-0 h-full w-[143%] max-w-none object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-[#111318] via-transparent to-black/20" />
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-[#08090b]/85 py-1.5 pl-1.5 pr-3 backdrop-blur-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-[#101114]" style={{ backgroundColor: mount.accent }}>{index + 1}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#f1e7d7]">{t('mountPreorderStep')} {index + 1}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-12">
                  <h3 id={`${mount.id}-title`} className="text-xl font-bold leading-tight tracking-tight text-[#fff5e8] sm:text-2xl lg:min-h-[3.6rem]">{mount.name}</h3>
                </div>
              </div>

              <div className="px-5 pb-5" style={{ background: `radial-gradient(ellipse at top right, ${mount.glow}, transparent 75%)` }}>
                <div className="border-b border-white/10 pb-4">
                  <p className="text-3xl font-black tracking-tight" style={{ color: mount.accent }}>{dollars(mount.stepPrice)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#aaa59d]">{t('mountPreorderStepSpend')}</p>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="text-[#bdb5a9]">{t('mountPreorderTotalToUnlock')}</span>
                    <strong className="text-base text-[#fff1d7]">{dollars(mount.requiredTotal)}</strong>
                  </div>
                  <p className="mt-2 text-[11px] text-[#aaa59d]">{index === 0 ? t('mountPreorderStart') : t('mountPreorderPrerequisite').replace('{step}', String(index))}</p>
                </div>

                <dl className="grid grid-cols-3 gap-2 py-4">
                  {['ATK SPD', 'DEF', 'MAX HP'].map(label => {
                    const stat = mount.stats.find(item => item.label === label)!
                    return (
                      <div key={label} className="min-w-0">
                        <dt className="text-[9px] font-bold tracking-wider text-[#a19a8e]">{stat.label}</dt>
                        <dd className="mt-1 text-base font-bold text-[#eee9df]">{stat.value}</dd>
                      </div>
                    )
                  })}
                </dl>

                <details className="group rounded-xl border border-white/10 bg-black/15">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-[#e0d4c0] outline-none focus-visible:ring-2 focus-visible:ring-[#c9aa68] [&::-webkit-details-marker]:hidden">
                    {t('mountPreorderNewStats')}
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </summary>
                  <dl className="space-y-2.5 border-t border-white/10 px-3 py-3">
                    {mount.stats.map(stat => (
                      <div key={stat.label} className="flex items-baseline justify-between gap-3 text-xs leading-relaxed">
                        <dt className="text-[#bbb5ab]">{stat.label}</dt>
                        <dd className="shrink-0 font-bold" style={{ color: mount.accent }}>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            </article>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-[#c9aa68]/20 bg-[#c9aa68]/5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h3 className="text-base font-bold text-[#f1d487]">{t('mountPreorderRulesTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#ddd4c6]">{t('mountPreorderOrderedSteps')}</p>
            <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-[#b6b0a5]">
              {[t('mountPreorderNewPurchasesOnly'), t('mountPreorderVerifiedSpend'), t('mountPreorderPreviousExcluded'), t('mountPreorderBonusOnly')].map(rule => (
                <li key={rule} className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c9aa68]" /><span>{rule}</span></li>
              ))}
            </ul>
          </div>
          {onBrowsePackages && (
            <button type="button" onClick={onBrowsePackages} className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-[#d3ad62] px-5 py-3 text-sm font-bold text-[#17130b] transition-colors hover:bg-[#e5c17a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5c17a]">
              {t('mountPreorderBrowsePackages')}
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        <p className="mt-5 border-t border-[#c9aa68]/15 pt-4 text-xs leading-relaxed text-[#a59d8f]">{t('mountPreorderDelivery')}</p>
      </div>
    </section>
  )
}
