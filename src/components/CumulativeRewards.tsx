import { useEffect, useMemo, useState } from 'react'
import { cumulativeRewards } from '../cumulativeRewards'
import { useI18n } from '../i18n'

function formatAmount(amount: number) {
  return `$${amount.toLocaleString()}`
}

const REWARD_ICON_ALIASES: Record<string, string> = {
  'Morion': 'morion.png',
  'Diamond': 'diamond.png',
  'Diamonds': 'diamonds.png',
  'golden Necklace Insignia': 'golden_necklace_insignia.png',
  'golden Ring Insignia': 'golden_ring_insignia.png',
  'Shining Weapon Enhancement Scroll Chest': 'shining_weapon_enhancement.png',
  'Shining Armor Enhancement Scroll Chest': 'shining_armor_enhancement.png',
  'Shining Accessory Enhancement Scroll Chest': 'shining_accessory_enhancement.png',
  'Gold Chest': 'gold_chest.png',
  "Sunset's Mount Summon Style x11": 'sunset_mount_summon.png',
  "Sunset's Weapon Summon Style x11": 'sunset_weapon_summon.png',
  '[L] Weapon Style Challenge Ticket': 'weapon_style_challenge_ticket.png',
  '[L] Mount Summon Challenge Ticket': 'mount_challenge_ticket.png',
  'Pupil Aircraft Toolbox': 'pupil_aircraft_toolbox.png',
  "Artisan's Aircaft Toolbox": 'artisans_aircraft_toolbox.png',
  "Artisan's Aircraft Toolbox": 'artisans_aircraft_toolbox.png',
  'Artisan Aircraft Toolbox': 'artisans_aircraft_toolbox.png',
  "Master's Aircraft Toolbox": 'masters_aircraft_toolbox.png',
  'NightCrow Claw Talisman Chest': 'night_crow_claw_talisman.png',
  'Night Crow Beak Circlet Chest': 'night_crow_beak_circle.png',
  'Night Crow Flight Feather Jewel Chest': 'night_crow_flight_feather.png',
  'Night Crow Feather Brooch Chest': 'night_crow_feather_brooch.png',
  'Night Hawk Mask Chest': 'night_crow_mask.png',
  'Night Hawk TailFeather Whistle Box': 'night_crow_tailfeather_whistle.png',
  'Hourglass of Desert': 'hourglass_of_deserts.png',
  'Die of Scorching Heat': 'die_of_scorching_heat.png',
  'Die of Oceans': 'die_of_oceans.png',
  'Die of Thunderbolts': 'die_of_thunderbolts.png',
  'Element Extraction of Harmony': 'element_extraction_of_harmony.png',
  'Elemental Extraction of Fusion 11 times': 'element_extraction_of_fusion.png',
  'Seal of Advancement': 'seal_of_advancement.png',
  'Higher Seal of Advancement': 'higher_seal_advancement.png',
  'Metal Fragment': 'metal_fragment.png',
  'MealBasket': 'meal_basket.png',
  '[UC] Crafting Material Selection Chest': 'uc_crafting_chest.png',
  '[C] Crafting Material x40 Selection Chest': 'advanced_crafting_box.png',
  '[R] Arcane Scroll Selection Chest': 'rare_scroll_box.png',
  'Time Recharger - Masarta Special Dungeon': 'time_recharger_masarta_special_dungeon.png',
  'Time Charging Device - Harphenon Sanctum': 'time_charging_harpenon.png',
  'Elemental Extraction of Fusion 11 times': 'element_extraction.png',
  'Brilliant Weapon Refinement Stone': 'brilliant_weapon_refinement_stone.png',
  'Brilliant Armor Refinement Stone': 'brilliant_armor_refinement_stone.png',
  'Brilliant Accessory Refinement Stone': 'brilliant_accessory_refinement_stone.png',
  'Shining Weapon Enhancement Chest': 'shining_weapon_enhancement.png',
  'Shining Armor Enhancement Chest': 'shining_armor_enhancement.png',
  'Shining Accessory Enhancement Chest': 'shining_accessory_enhancement.png',
  'Knight Jewel': 'knight_jewel.png',
  'Fighter Jewel': 'fighter_jewel.png',
  "Philosopher's Jewel": 'philosophers_jewel.png',
  'Incense Burner of Vitality': 'incense_burner_of_vitality.png',
  'Incense Burner of Mentality': 'incense_burner_of_mentality.png',
  'Incense Burner of Endurance': 'incense_burner_of_endurance.png',
  'Nightcrows Stimulant of Growth': 'growth_stimulant.png',
  'Eligio Stimulant of EXP': 'exp_bottle.png',
  'crusade Loot Chest': 'crusader_spoils_chest.png',
  'Tiaraka of Flushing': 'taraka.png',
  "Guardian's Scepter": 'guardian_scepter.png',
}

function splitRewardText(reward: string) {
  const normalized = reward.replace(/\s+/g, ' ').trim()
  const quantityMatch = normalized.match(/\s+(?:×|\*|x)\s*([\d,]+)\s*$/i)
  const bareQuantityMatch = !quantityMatch
    ? normalized.match(/\s+([\d,]+)\s*$/)
    : null
  const match = quantityMatch ?? bareQuantityMatch

  const displayName = match ? normalized.slice(0, match.index).trim() : normalized
  const quantity = match ? Number(match[1].replace(/,/g, '')) : null

  // Keep enhancement levels such as +8, +9, +10 and +11 visible to players.
  // Only normalize the name used for matching an icon filename.
  const iconName = displayName
    .replace(/\s*·\s*\+\d+\s*$/i, '')
    .replace(/^\+\d+\s+/, '')
    .replace(/\s*\((?:bound|attributed|attribution)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { displayName, iconName, quantity }
}

function rewardNameToFilename(name: string) {
  return `${name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/\bx11\b/gi, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}.png`
}

function getRewardIconCandidates(name: string) {
  const alias = REWARD_ICON_ALIASES[name]
  const generated = rewardNameToFilename(name)
  const withoutOf = generated.replace(/_of_/g, '_')
  return Array.from(new Set([alias, generated, withoutOf].filter(Boolean) as string[]))
    .map(filename => `/images/${filename}`)
}

function RewardIcon({ name, tMissing, unavailable }: { name: string; tMissing: string; unavailable: string }) {
  const candidates = useMemo(() => getRewardIconCandidates(name), [name])
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => {
    setCandidateIndex(0)
  }, [name])

  const iconPath = candidates[candidateIndex]
  const failed = !iconPath

  if (failed) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#3b414b] bg-[#181b21] text-sm font-bold text-[#8f8b84]"
        title={`${tMissing}: ${name}`}
        aria-label={`${name} ${unavailable}`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#3b414b] bg-[#181b21] p-1">
      <img
        src={iconPath}
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setCandidateIndex(current => current + 1)}
      />
    </div>
  )
}

export function CumulativeRewards() {
  const { t } = useI18n()
  const [expandedAmount, setExpandedAmount] = useState<number | null>(
    cumulativeRewards[0]?.amount ?? null
  )

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#eee9df]">
          {t('cumulativeRewards')}
        </h2>

        <p className="text-sm leading-6 text-[#8f8b84]">
          {t('cumulativeIntro')}
        </p>

        <a
          href="https://account.playcrows.com/bonus.php"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 py-2 text-sm font-bold text-[#c9aa68] transition-all hover:border-[#c9aa68] hover:bg-[#c9aa68]/20"
        >
          {t('claimCumulative')}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#292d34] bg-[#111318] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
            {t('milestones')}
          </div>
          <div className="mt-1 text-xl font-bold text-[#c9aa68]">
            {cumulativeRewards.length}
          </div>
        </div>

        <div className="rounded-xl border border-[#292d34] bg-[#111318] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
            {t('startingTier')}
          </div>
          <div className="mt-1 text-xl font-bold text-[#eee9df]">
            {formatAmount(cumulativeRewards[0]?.amount ?? 0)}
          </div>
        </div>

        <div className="rounded-xl border border-[#292d34] bg-[#111318] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
            {t('highestTier')}
          </div>
          <div className="mt-1 text-xl font-bold text-[#eee9df]">
            {formatAmount(cumulativeRewards[cumulativeRewards.length - 1]?.amount ?? 0)}
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
                  ? 'border-[#c9aa68]/60 bg-[#c9aa68]/5'
                  : 'border-[#292d34] bg-[#111318]'
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
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
                    {t('cumulativeMilestone')}
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-[#c9aa68]">
                    {formatAmount(tier.amount)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-[#3b414b] px-3 py-1 text-[11px] font-semibold text-[#aaa49a]">
                    {tier.rewards.length}{' '}
                    {tier.rewards.length === 1 ? t('reward') : t('rewards')}
                  </span>
                  <span
                    className={`text-xl text-[#c9aa68] transition-transform ${expanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-[#292d34] px-5 py-4">
                  <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {tier.rewards.map((reward, index) => {
                      const parsed = splitRewardText(reward)

                      return (
                        <li
                          key={`${tier.amount}-${index}-${reward}`}
                          className="flex min-h-[62px] min-w-0 items-center gap-3 rounded-xl border border-[#292d34] bg-[#0d0f13] px-3 py-2.5 transition-colors hover:border-[#3b414b]"
                        >
                          <RewardIcon
                            name={parsed.iconName}
                            tMissing={t('missingIcon')}
                            unavailable={t('iconUnavailable')}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-semibold leading-5 text-[#dfe5ef]">
                              {parsed.displayName}
                            </div>
                          </div>

                          {parsed.quantity !== null && Number.isFinite(parsed.quantity) && (
                            <strong className="shrink-0 pl-2 text-sm font-bold tabular-nums text-[#c9aa68]">
                              ×{parsed.quantity.toLocaleString()}
                            </strong>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="rounded-r-xl border border-[#292d34] border-l-2 border-l-[#c9aa68] bg-[#0f1115] px-4 py-3 text-xs leading-5 text-[#99938a]">
        {t('cumulativeNotice')}
      </div>
    </section>
  )
}
