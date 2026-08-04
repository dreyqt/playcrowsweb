import { giftPackages, type GiftPackageCategory } from '../giftPackageData'

interface GiftPackagesProps {
  selectedPackageId?: string | null
  onSelectPackage?: (packageId: string) => void
}

const sections: Array<{ category: GiftPackageCategory; title: string; description: string }> = [
  { category: 'currency', title: 'Currency', description: 'Diamond packages currently available in the web shop.' },
  { category: 'support', title: 'Support Packages', description: 'Item bundles available for direct support purchases.' },
]

export function GiftPackages({ selectedPackageId, onSelectPackage }: GiftPackagesProps) {
  return (
    <section className="gift-packages">
      <div className="gift-packages__header">
        <h2>Gift Packages → WEB Shop</h2>
        <p>Select either a Currency package or a Support Package.</p>
      </div>

      {sections.map(section => (
        <div key={section.category} className="mb-10">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-[#e8eaf0]">{section.title}</h3>
            <p className="mt-1 text-sm text-[#7c879d]">{section.description}</p>
          </div>

          <div className="gift-packages__grid">
            {giftPackages.filter(item => item.category === section.category).map(giftPackage => {
              const isSelected = selectedPackageId === giftPackage.id
              return (
                <article className={`gift-package-card ${isSelected ? 'gift-package-card--selected' : ''}`} key={giftPackage.id}>
                  <header className="gift-package-card__header">
                    <div>
                      <span className="gift-package-card__label">{giftPackage.category === 'currency' ? 'Currency' : 'Support Package'}</span>
                      <h3>{giftPackage.title}</h3>
                      <div className="mt-1 text-xl font-bold text-[#66d4ff]">${giftPackage.amount.toLocaleString()}</div>
                    </div>
                    {isSelected && <span className="gift-package-card__selected">Selected</span>}
                  </header>

                  <ul className="gift-package-card__rewards">
                    {giftPackage.rewards.map(reward => (
                      <li key={reward.name}>
                        <span>{reward.name}</span>
                        {reward.quantity !== undefined && <strong>×{reward.quantity.toLocaleString()}</strong>}
                      </li>
                    ))}
                  </ul>

                  {onSelectPackage && (
                    <button type="button" className="gift-package-card__button" onClick={() => onSelectPackage(giftPackage.id)}>
                      Select {giftPackage.title}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      ))}

      <div className="gift-packages__notice">
        Select a package to continue. Bound items cannot be traded or transferred.
      </div>
    </section>
  )
}
