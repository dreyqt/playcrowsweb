import { useState } from 'react'
import { cumulativeRewards } from '../cumulativeRewards'
import { useI18n } from '../i18n'

function formatAmount(amount: number) {
  return `$${amount.toLocaleString()}`
}

export function CumulativeRewards() {
  const { t } = useI18n()
  const [expandedAmount, setExpandedAmount] = useState<number | null>(
    cumulativeRewards[0]?.amount ?? null
  )

  return (
    <section className="flex flex-col gap-6">
    <div>
      <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">
        {t('cumulativeRewards')}
      </h2>

      <p className="text-sm leading-6 text-[#7c879d]">
        {t('cumulativeIntro')}
      </p>

      <a
        href="https://account.playcrows.com/bonus.php"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#66d4ff]/50 bg-[#66d4ff]/10 px-4 py-2 text-sm font-bold text-[#66d4ff] transition-all hover:border-[#66d4ff] hover:bg-[#66d4ff]/20"
      >
        {t('claimCumulative')}
      </a>
    </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#252a38] bg-[#13161e] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
            {t('milestones')}
          </div>
          <div className="mt-1 text-xl font-bold text-[#66d4ff]">
            {cumulativeRewards.length}
          </div>
        </div>

        <div className="rounded-xl border border-[#252a38] bg-[#13161e] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
            {t('startingTier')}
          </div>
          <div className="mt-1 text-xl font-bold text-[#e8eaf0]">
            {formatAmount(cumulativeRewards[0]?.amount ?? 0)}
          </div>
        </div>

        <div className="rounded-xl border border-[#252a38] bg-[#13161e] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
            {t('highestTier')}
          </div>
          <div className="mt-1 text-xl font-bold text-[#e8eaf0]">
            {formatAmount(
              cumulativeRewards[cumulativeRewards.length - 1]?.amount ?? 0
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {cumulativeRewards.map(tier => {
          const expanded = expandedAmount === tier.amount

          return (
            <article
              key={tier.amount}
              className={`overflow-hidden rounded-xl border transition-colors ${
                expanded
                  ? 'border-[#66d4ff]/60 bg-[#66d4ff]/5'
                  : 'border-[#252a38] bg-[#13161e]'
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() =>
                  setExpandedAmount(current =>
                    current === tier.amount ? null : tier.amount
                  )
                }
                aria-expanded={expanded}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                    {t('cumulativeMilestone')}
                  </div>

                  <div className="mt-1 text-xl font-extrabold text-[#66d4ff]">
                    {formatAmount(tier.amount)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-[#353c52] px-3 py-1 text-[11px] font-semibold text-[#9aa6ba]">
                    {tier.rewards.length}{' '}
                    {tier.rewards.length === 1 ? t('reward') : t('rewards')}
                  </span>

                  <span
                    className={`text-xl text-[#66d4ff] transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  >
                   ⌄
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-[#252a38] px-5 py-4">
                  <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {tier.rewards.map((reward, index) => (
                      <li
                        key={`${tier.amount}-${index}-${reward}`}
                        className="flex min-w-0 items-start gap-3 rounded-lg border border-[#252a38] bg-[#0f1219] px-3 py-3"
                      >
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#66d4ff]/10 px-1 text-[10px] font-bold text-[#66d4ff]">
                          {index + 1}
                        </span>

                        <span className="min-w-0 break-words text-xs leading-5 text-[#cbd2de]">
                          {reward}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="rounded-r-xl border border-[#252a38] border-l-2 border-l-[#66d4ff] bg-[#11151d] px-4 py-3 text-xs leading-5 text-[#8792a8]">
        {t('cumulativeNotice')}
      </div>
    </section>
  )
}
