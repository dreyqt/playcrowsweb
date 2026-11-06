# Boosting Packs update — October 15, 2026

V1 purchase-policy follow-up: each Boosting tier is now limited to one purchase per account, quantity 1. See [V1 Boosting purchase limit](V1_BOOSTING_PURCHASE_LIMIT.md) for the required migration and payment-function updates. V2 remains unchanged.

## What changed

- Added a Boosting Packs shop category for V1 and V2, with $50, $200, $500 and $1,000 packages.
- Preserved all supplied base rewards and quantities: 34, 46, 47 and 48 items respectively. The $50 package now follows the same resource-first ordering and item/quantity formatting as the other tiers. No Mileage was added to the $50 tier.
- Each $500 package includes Golden Necklace Insignia (Attributed) ×4 and Golden Ring Insignia (Attribution) ×4.
- Each $1,000 package includes **all nine supplied Legendary weapons, one of each**, as clarified. This is not a weapon choice. V2 purchases of multiple packages multiply every bonus quantity; V1 allows each tier once per account.
- Bonuses are per package: smaller packages do not combine to unlock them, and the $1,000 package does not also receive the $500 accessory bonus.
- V2 Boosting packages alone earn double cumulative value: $100, $400, $1,000 and $2,000 per package. V1 keeps ordinary face value. Payment amounts and existing $100 event-bonus selections retain their existing calculations.
- Added bonus notices in the shop, reward details, amount step and final review, with translations for the site's six languages.
- Added separate cumulative-value and bonus snapshots to donation records, administrator order details and notification content. Existing historical records are preserved. Game reward delivery remains the existing staff fulfillment process.

## Deployment order

The update is prepared locally. No live database or website deployment was performed.

1. Apply `supabase/migrations/20261015_boosting_packages.sql` to the existing Supabase project. This adds `cumulative_credit_usd`, `boosting_bonus_rewards` and the server-side rules that calculate and preserve them. Apply this before the new application or functions, because they read these fields.
2. Deploy the updated function sources from the repository's existing `supabase/edgefunction/` folder: `submit-donation`, `paypal-checkout`, `recover-paypal-payment` and `update-donation-discord-status`. Use the existing function deployment process; this repository uses the singular `edgefunction` source folder.
3. Build and deploy the website using its existing Vercel workflow and existing environment variables.

For any separate cumulative-reward ledger or reporting process outside this website, use `cumulative_credit_usd` for new eligible, verified orders. Do not double the amount paid. Historical rows with null credit retain the previous accounting fallback. No separate external game ledger was accessible or changed.

## Verification

- Production build passed.
- Unit and edge-handler regression checks passed, including catalog consistency, trusted prices, all nine weapon bonuses, payment recovery, notification content and administrator fulfillment.
- Six local PostgreSQL migration tests passed, covering both servers, all package tiers, quantity limits, historical preservation, tamper resistance and safe reruns.
- Nine Boosting browser scenarios passed: exact reward lists for both servers, desktop/mobile layout, quantity changes, manual checkout and mocked PayPal checkout. No real payment, receipt upload or notification was sent.
- Existing checkout and October shop browser regressions passed.
- Full TypeScript checking still reports six pre-existing missing translation-key errors in the unused `src/components/OctoberBonusNotice.tsx`. That file is unchanged and is not imported by the application. The production build succeeds.

The accompanying update archive contains only changed/new source, migration, tests and this note. It contains no credentials, dependencies or build output.
