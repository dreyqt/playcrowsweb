import { giftPackages } from '../giftPackageData'

interface GiftPackagesProps {
  selectedAmount?: number;
  onSelectAmount?: (amount: number) => void;
}

export function GiftPackages({
  selectedAmount,
  onSelectAmount,
}: GiftPackagesProps) {
  return (
    <section className="gift-packages">
      <div className="gift-packages__header">
        <h2>Gift Packages</h2>
        <p>
          View the rewards included with each support amount.
        </p>
      </div>

      <div className="gift-packages__grid">
        {giftPackages.map((giftPackage) => {
          const isSelected = selectedAmount === giftPackage.amount;

          return (
            <article
              className={`gift-package-card ${
                isSelected ? "gift-package-card--selected" : ""
              }`}
              key={giftPackage.amount}
            >
              <header className="gift-package-card__header">
                <div>
                  <span className="gift-package-card__label">
                    Support Package
                  </span>

                  <h3>${giftPackage.amount.toLocaleString()}</h3>
                </div>

                {isSelected && (
                  <span className="gift-package-card__selected">
                    Selected
                  </span>
                )}
              </header>

              <ul className="gift-package-card__rewards">
                {giftPackage.rewards.map((reward) => (
                  <li key={reward.name}>
                    <span>{reward.name}</span>

                    {reward.quantity !== undefined && (
                      <strong>
                        ×{reward.quantity.toLocaleString()}
                      </strong>
                    )}
                  </li>
                ))}
              </ul>

              {onSelectAmount && (
                <button
                  type="button"
                  className="gift-package-card__button"
                  onClick={() => onSelectAmount(giftPackage.amount)}
                >
                  Select ${giftPackage.amount.toLocaleString()} Package
                </button>
              )}
            </article>
          );
        })}
      </div>

      <div className="gift-packages__notice">
        Package rewards are based on the selected support amount. Bound items
        cannot be traded or transferred.
      </div>
    </section>
  );
}