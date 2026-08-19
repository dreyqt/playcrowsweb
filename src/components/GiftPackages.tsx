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
}

function rewardNameToFilename(name: string) {
  const withoutQualifier = name
    .replace(/\s*\((?:bound|attributed|attribution)\)\s*/gi, ' ')
    .replace(/\bx11\b/gi, '')
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#3b414b] bg-[#181b21] text-sm font-bold text-[#8f8b84]"
        title={`${tMissing}: ${iconPath}`}
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

  useEffect(() => {
    if (selectedCategory) {
      setActiveCategory(selectedCategory)
    }
  }, [selectedCategory])

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
          {visiblePackages.map(giftPackage => {
            const isSelected = selectedPackageId === giftPackage.id

            return (
              <article
                className={`gift-package-card ${isSelected ? 'gift-package-card--selected' : ''}`}
                key={giftPackage.id}
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

                <ul className="mt-4 space-y-2">
                  {giftPackage.rewards.map(reward => (
                    <li
                      key={reward.name}
                      className="flex min-h-[62px] items-center gap-3 rounded-xl border border-[#292d34] bg-[#0d0f13] px-3 py-2.5 transition-colors hover:border-[#3b414b]"
                    >
                      <RewardIcon name={reward.name} tMissing={t('missingIcon')} unavailable={t('iconUnavailable')} />

                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-semibold leading-5 text-[#dfe5ef]">
                          {reward.name}
                        </div>
                      </div>

                      {reward.quantity !== undefined && (
                        <strong className="shrink-0 pl-2 text-sm font-bold tabular-nums text-[#c9aa68]">
                          ×{reward.quantity.toLocaleString()}
                        </strong>
                      )}
                    </li>
                  ))}
                </ul>

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
      </div>

      <div className="gift-packages__notice">
        {t('packageContinueNotice')}
      </div>
    </section>
  )
}
