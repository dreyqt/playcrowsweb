import { useEffect, useMemo, useState } from 'react'
import { giftPackages, type GiftPackageCategory } from '../giftPackageData'
import { useI18n } from '../i18n'

interface GiftPackagesProps {
  selectedPackageId?: string | null
  onSelectPackage?: (packageId: string) => void
}

/*
 * Most item icons are resolved automatically from the reward name.
 * These aliases only cover filenames that intentionally use a shorter
 * or different name inside public/images/.
 */
const REWARD_ICON_ALIASES: Record<string, string> = {
  'Black Wing Special Supply': 'black_wings_special_supply.png',
  'Sunset Splendid Weapon Style Summon x11 (Bound)': 'sunset_weapon_summon.png',
  'Sunset Splendid Mount Summon x11 (Bound)': 'sunset_mount_summon.png',
  'Time Recharger - Masarta Special Dungeon': 'time_recharger_masarta_special_dungeon.png',
  'Element Extraction of Harmony (Bound)': 'element_extraction_of_harmony.png',
  'Source of Wisdom (Bound)': 'source_wisdom.png',
  'Source of Growth (Bound)': 'source_growth.png',
  'Treasure Guild Coin Chest (Bound)': 'treasure_guild_coins.png',
  'High Seal of Advancement (Bound)': 'higher_seal_advancement.png',
  "Star's Memory (Bound)": 'star_memory.png',
  'Aura of Intense Expression (Attribution)': 'aura_intense_expression.png',
  'Cyclical Manifestation Energy (Attribution)': 'cyclical_manifestation_energy.png',
  'Diamonds': 'diamonds.png',
  'Mileage': 'mileage.png',
  'Crusade Loot Chest (Attributed)': 'crusader_spoils_chest.png',
  "Guardian's Scepter (Attribution)": 'guardian_scepter.png',
  'Shining Armor Enhancement Scroll Chest (Bound)': 'shining_armor_enhancement.png',
  'Shining Weapon Enhancement Scroll Chest (Bound)': 'shining_weapon_enhancement.png',
  'Shining Accessory Enhancement Scroll Chest (Bound)': 'shining_accessory_enhancement.png',
  'Wind Orb Chest (Attributed)': 'wind_orb_box.png',
  "Forgotten One's Remnant Selection Chest (Bound)": 'forgotten_ones_remnant_selection_chest.png',
  'Elemental Extraction of   Fusion 11 times (attribution)': 'elemental_extraction_of_fusion.png',
  'Contibution Coin': 'contribution_coin.png',
  'Time Recharger - Land of Prosperty (Bound)': 'time_recharger_land_of_prosperity.png',
  'NightCrows Stimulant of Growth (Bound)': 'nightcrows_stimulant_of_growth.png',
  'Elemental Extraction of Fusion 11 times (attribution)': 'elemental_extraction_of_fusion.png',
  'Elemental Extraction of   Fusion 11 times (attribution)': 'elemental_extraction_of_fusion.png',
  'Time Recharger - Land of Prosperty (Bound)': 'time_recharger_land_of_prosperity.png',
  '+10 Night Crows Beak Circlet (Bound)': 'night_crows_beak_circlet.png',
  '+10 Night Crows Feather Brooch (Bound)': 'night_crows_feather_brooch.png',
  '+10 Night Crows Claw Talisman (Bound)': 'night_crows_claw_talisman.png',
  '+10 nighthawk Mask (Attributed)': 'nighthawk_mask.png',
  '+10 nighthawk Taileather Whistle (attributed)': 'nighthawk_taileather_whistle.png',
}

function rewardNameToFilename(name: string) {
  const withoutQualifier = name
    .replace(/^\s*\+\d+\s+/i, '')
    .replace(/\s*\((?:bound|attributed|attribution)\)\s*/gi, ' ')
    .replace(/\bx11\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return `${withoutQualifier
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}.png`
}

function getRewardIconPath(name: string) {
  const filename = REWARD_ICON_ALIASES[name] ?? rewardNameToFilename(name)
  return `/images/${filename}`
}

function RewardIcon({ name, tMissing, unavailable }: { name: string; tMissing: string; unavailable: string }) {
  const [failed, setFailed] = useState(false)
  const iconPath = getRewardIconPath(name)

  useEffect(() => {
    setFailed(false)
  }, [iconPath])

  if (failed) {
    return (
      <div
        className="gift-reward-icon gift-reward-icon--fallback"
        title={`${tMissing}: ${iconPath}`}
        aria-label={`${name} ${unavailable}`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <div className="gift-reward-icon">
      <img
        src={iconPath}
        alt=""
        className="gift-reward-icon__image"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function GiftPackages({ selectedPackageId, onSelectPackage }: GiftPackagesProps) {
  const { t } = useI18n()
  const sections: Record<GiftPackageCategory, { title: string; description: string }> = {
    currency: { title: t('currency'), description: t('currencyDesc') },
    support: { title: t('supportPackages'), description: t('supportPackagesDesc') },
    'august-supply': { title: t('augustSupplyPackages'), description: t('augustSupplyPackagesDesc') },
  }
  const selectedCategory = useMemo<GiftPackageCategory | null>(() => {
    if (!selectedPackageId) return null
    return giftPackages.find(item => item.id === selectedPackageId)?.category ?? null
  }, [selectedPackageId])

  const [activeCategory, setActiveCategory] = useState<GiftPackageCategory>(
    selectedCategory ?? 'currency'
  )
  const [expandedPackageIds, setExpandedPackageIds] = useState<Set<string>>(
    () => new Set()
  )

  const togglePackageRewards = (packageId: string) => {
    setExpandedPackageIds(current => {
      const next = new Set(current)
      if (next.has(packageId)) next.delete(packageId)
      else next.add(packageId)
      return next
    })
  }

  useEffect(() => {
    if (selectedCategory) {
      setActiveCategory(selectedCategory)
    }
  }, [selectedCategory])

  const togglePackageRewards = (packageId: string) => {
    setExpandedPackages(current => {
      const next = new Set(current)
      if (next.has(packageId)) next.delete(packageId)
      else next.add(packageId)
      return next
    })
  }

  const section = sections[activeCategory]
  const visiblePackages = giftPackages.filter(
    item => item.category === activeCategory
  )

  return (
    <section className="gift-packages">
      <div className="gift-packages__header">
        <h2>{t('webShop')}</h2>
        <p>{t('webShopIntro')}</p>
      </div>

      <nav className="gift-package-tabs" aria-label={t('webShop')}>
        {(Object.keys(sections) as GiftPackageCategory[]).map(category => (
          <button
            key={category}
            type="button"
            className={`gift-package-tabs__button ${
              activeCategory === category ? 'gift-package-tabs__button--active' : ''
            }`}
            onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category}
          >
            {sections[category].title}
          </button>
        ))}
      </nav>

      <div className="gift-package-category">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#eee9df]">{section.title}</h3>
          <p className="mt-1 text-sm text-[#8f8b84]">{section.description}</p>
        </div>

        <div className="gift-packages__grid">
          {[0, 1].map(columnIndex => (
            <div className="gift-packages__column" key={columnIndex}>
              {visiblePackages
                .map((giftPackage, originalIndex) => ({ giftPackage, originalIndex }))
                .filter(({ originalIndex }) => originalIndex % 2 === columnIndex)
                .map(({ giftPackage, originalIndex }) => {
                  const isSelected = selectedPackageId === giftPackage.id
                  const isExpanded = expandedPackageIds.has(giftPackage.id)
                  const collapsedRewardCount = 3
                  const hasMoreRewards = giftPackage.rewards.length > collapsedRewardCount
                  const visibleRewards = isExpanded
                    ? giftPackage.rewards
                    : giftPackage.rewards.slice(0, collapsedRewardCount)
                  const hiddenRewardCount = Math.max(
                    0,
                    giftPackage.rewards.length - collapsedRewardCount
                  )

                  return (
                    <article
                      className={`gift-package-card ${isSelected ? 'gift-package-card--selected' : ''}`}
                      key={giftPackage.id}
                      style={{ order: originalIndex }}
                    >
                <header className="gift-package-card__header">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="gift-package-card__label">
                        {giftPackage.category === 'currency'
                          ? t('currency')
                          : giftPackage.category === 'august-supply'
                            ? t('augustSupplyPackage')
                            : t('supportPackage')}
                      </span>
                      {giftPackage.isNew && (
                        <span className="inline-flex items-center rounded-full border border-[#e7c36a]/60 bg-[#e7c36a]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#f1d487] shadow-[0_0_16px_rgba(231,195,106,0.14)]">
                          NEW
                        </span>
                      )}
                    </div>
                    <h3>{giftPackage.title}</h3>
                    <div className="mt-1 text-xl font-bold text-[#c9aa68]">
                      ${giftPackage.amount.toLocaleString()}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="gift-package-card__selected">{t('selected')}</span>
                  )}
                </header>

                <ul className="gift-package-card__reward-list">
                  {visibleRewards.map(reward => (
                    <li
                      key={reward.name}
                      className="gift-package-card__reward-row"
                    >
                      <RewardIcon name={reward.name} tMissing={t('missingIcon')} unavailable={t('iconUnavailable')} />

                      <div className="gift-package-card__reward-copy">
                        <div className="gift-package-card__reward-name">
                          {reward.name}
                        </div>
                      </div>

                      {reward.quantity !== undefined && (
                        <strong className="gift-package-card__reward-quantity">
                          ×{reward.quantity.toLocaleString()}
                        </strong>
                      )}
                    </li>
                  ))}
                </ul>

                {hasMoreRewards && (
                  <button
                    type="button"
                    className="gift-package-card__more-button"
                    onClick={() => togglePackageRewards(giftPackage.id)}
                    aria-expanded={isExpanded}
                  >
                    <span>
                      {isExpanded
                        ? 'Show less'
                        : `+ ${hiddenRewardCount} more reward${hiddenRewardCount === 1 ? '' : 's'}`}
                    </span>
                    <span
                      className={`gift-package-card__more-chevron ${
                        isExpanded ? 'gift-package-card__more-chevron--open' : ''
                      }`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>
                )}

                {onSelectPackage && (
                  <button
                    type="button"
                    className="gift-package-card__button"
                    onClick={() => onSelectPackage(giftPackage.id)}
                  >
                    {t('select')} {giftPackage.title}
                  </button>
                )}
                    </article>
                  )
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="gift-packages__notice">
        {t('packageContinueNotice')}
      </div>
    </section>
  )
}
