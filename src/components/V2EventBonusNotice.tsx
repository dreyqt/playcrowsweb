import { useId, useState } from 'react'
import { useI18n } from '../i18n'

const EVENT001_REWARDS = [
  "Sunset's Mount Summon x11 (Bound) ×4",
  "Sunset's Weapon Style Summon x11 (Bound) ×4",
  'Night Crows Stimulant of Growth (Bound) ×10',
  'Food Basket (Bound) ×20',
  'Gold Chest (Bound) ×100',
  'Mileage ×10,000',
]

const EVENT002_REWARDS = [
  'Elemental Extraction of Fusion 11 Times (Attributed) ×10',
  'Guild Coin Bundle (Bound) ×20',
  "Eligio's Stimulant of EXP (Bound) ×20",
  'Contribution Coin ×10,000',
  "Sunset's Splendid Mount Summon x11 (Bound) ×30",
  "Sunset's Splendid Weapon Style Summon x11 (Bound) ×30",
  'Night Crows Stimulant of Growth (Bound) ×20',
]

const EVENT003_REWARDS = [
  'Mileage ×20,000',
  'High Seal of Advancement (Bound) ×3',
  'Seal of Advancement (Bound) ×75',
  'Spell Rune Crystal I (Bound) ×500',
  'Spell Starlight Crystal I (Bound) ×500',
  'Enchantment Frost Crystal I (Attributed) ×500',
  'Moonlight Protection Talisman (Bound) ×10',
  'Sun Battle Talisman (Bound) ×10',
]

function RewardBundle({ title, rewards }: { title: string; rewards: string[] }) {
  return (
    <div className="rounded-lg border border-[#8b5cf6]/20 bg-[#111318] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm text-[#d7d2ca] sm:grid-cols-2">
        {rewards.map(reward => (
          <li key={reward} className="flex gap-2">
            <span aria-hidden="true" className="text-[#a78bfa]">◆</span>
            <span>{reward}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** V2-only informational bonus notice. Reward fulfillment remains part of the existing admin process. */
export function V2EventBonusNotice() {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()

  return (
    <aside
      aria-label={t('v2EventBonusTitle')}
      className="overflow-hidden rounded-xl border border-[#8b5cf6]/45 bg-[#8b5cf6]/7"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#8b5cf6]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8b5cf6] sm:px-5"
        onClick={() => setExpanded(current => !current)}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a78bfa]">PlayCrows V2</div>
          <h3 className="mt-1 text-base font-bold text-[#d8c7ff]">{t('v2EventBonusTitle')}</h3>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#a78bfa]">
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
        <div id={contentId} className="border-t border-[#8b5cf6]/25 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <div className="rounded-lg border border-[#8b5cf6]/25 bg-[#111318] p-4">
            <p className="text-base font-bold text-[#eee9df]">{t('v2EventBonusSummary')}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#c4b5fd]">{t('v2EventBonusRepeatable')}</p>
            <p className="mt-2 text-xs leading-relaxed text-[#aaa49a]">{t('v2EventBonusChoiceHint')}</p>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <RewardBundle title={t('v2EventBonusBundle')} rewards={EVENT001_REWARDS} />
            <RewardBundle title={t('v2EventBonusBundle002')} rewards={EVENT002_REWARDS} />
            <RewardBundle title={t('v2EventBonusBundle003')} rewards={EVENT003_REWARDS} />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#aaa49a]">{t('v2EventBonusNote')}</p>
          <a
            href="/events?server=v2"
            className="mt-3 inline-flex text-sm font-semibold text-[#c4b5fd] underline decoration-[#8b5cf6]/60 underline-offset-4 hover:text-[#ddd6fe]"
          >
            {t('v2EventBonusViewEvent')}
          </a>
        </div>
      )}
    </aside>
  )
}
