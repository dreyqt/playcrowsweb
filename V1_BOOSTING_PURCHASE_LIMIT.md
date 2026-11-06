# V1 Boosting purchase limit — October 15, 2026

Each account can purchase each V1 Boosting tier ($50, $200, $500 and $1,000) once. Buying one tier does not prevent buying the other tiers. Each order is limited to quantity 1. V2 retains its existing quantities and double cumulative value.

## Shop and checkout

- Every V1 Boosting card, reward panel and checkout notice displays the restriction in the site's six languages.
- V1 Boosting quantity is fixed at 1. An eligibility check runs after the customer enters their Login ID, before showing any payment instructions.
- The database enforces the restriction for manual payments, PayPal, recovery and simultaneous submissions. Changing letter case or spaces in the Login ID does not create a new account allowance. This uses the webshop's existing Login ID identity, not character names or browser storage.
- PayPal reserves the tier before capture. If confirmation fails, the customer can retry the same approved order. Checkout changes are locked while confirmation is unresolved, and the order ID is shown for support.

## Existing purchases and order review

- Previous verified or delivered V1 Boosting purchases count toward the limit. Existing quantities, rewards, accounting and historical duplicate orders are preserved.
- A pending order temporarily holds its tier. Rejecting an unpaid, unverified, undelivered manual order releases the tier, unless another historical active order still holds it.
- A verified or delivered purchase consumes its tier permanently, including after later record deletion or status changes.
- Payments captured by PayPal before the rule took effect remain recoverable with their original quantities. The timestamp comes from PayPal evidence.
- Uncertain PayPal captures retain their reservation. They do not expire automatically. Retry confirmation on the same page and order; after a refresh or unresolved provider failure, support must check the PayPal order/capture state before releasing an unpaid reservation. Do not clear a reservation for an already charged order; recover that payment instead.

## Deployment

The source is updated locally. No production website, function or database deployment has been performed.

Use a brief checkout maintenance window so the previous payment handler cannot capture new Boosting orders while these components are being replaced. Allow in-progress payment requests to finish before applying the change.

1. Ensure the earlier Boosting update, including `supabase/migrations/20261015_boosting_packages.sql`, is installed. Keep the repository's existing schema migrations, including `normalize_playcrows_player_id`.
2. Apply `supabase/migrations/20261016_v1_boosting_purchase_limit.sql` to the existing Supabase project. It creates a private claims ledger, seeds existing eligible orders and installs the database guard in one transaction. It records the rule's effective time automatically and is safe to rerun.
3. Deploy the updated `paypal-checkout`, `submit-donation` and `recover-paypal-payment` functions from the repository's existing `supabase/edgefunction/` folder. Keep the existing function configuration and environment variables.
4. Build and deploy the frontend through the existing Vercel workflow, then reopen checkout. No new environment variables are required.

Applying only the frontend will not enforce the account limit. The database migration and all three function updates are part of this release.

## Verification

- Production build passed.
- All 64 unit and edge-handler regression tests passed.
- All 15 local PostgreSQL integration scenarios passed: nine new purchase-limit scenarios and six existing Boosting reward/accounting scenarios. These cover historical preservation, normalized identities, quantity limits, claim conflicts, rollback, rejection, permanent consumption, recovery and safe migration reruns.
- All 21 browser cases passed: 10 focused V1 restriction cases and 11 broader Boosting checkout cases, including PayPal confirmation failure followed by a same-order retry. Desktop/mobile, all four tiers, payment eligibility failures, completed-order resumption and V2 behavior were checked.
- All payment, database and notification requests in tests used isolated fixtures or mocks. No real payment was made.
- Full TypeScript checking still reports the same six pre-existing missing translation keys in the unused `src/components/OctoberBonusNotice.tsx`. This file is unchanged; the production build passes.

The update archive contains changed/new source, migration, tests and release notes. It excludes credentials, dependencies and local preview build output. Apply it over the source that already contains the earlier Boosting Packs update.
