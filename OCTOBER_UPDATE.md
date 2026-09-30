# October webshop update — White Tiger for $500 or $1,000

Updated from the supplied `playcrowsweb.zip`. The live website and database have not been changed.

## Included changes

- Removed August packages from V1 and from active checkout/submission validation. Historical August orders remain readable and recoverable.
- Both V1 and V2 now show the same category tabs, in order: Currency, Support Packages, September Supply Packages, October Packages.
- Added the $50, $100, $500 and $1,000 October packages to both servers using the latest revised lists. All 73 reward entries and quantities are included in the supplied order. Item #12080765 is named **Torn Invoices (Attribution)** as confirmed by the user.
- **The White Tiger of Manouille I** is the only October mount reward. Purchase either the **$500 or $1,000 October package** to qualify after payment verification. Both tiers share one reward per player/server. The $100 tier does not qualify.
- Removed the $1,000 Griffin bonus and the $2,000 cumulative Red Death bonus from the active shop, notifications and fulfillment instructions. The $1,000 package and all package contents remain available. No cumulative spending requirement applies to the Tiger.
- Updated admin fulfillment details and notification formatting. The database reserves eligibility; the existing staff fulfillment process delivers the mount.
- Added October UI translations for all six existing languages. Existing missing-item icon fallbacks are used where the supplied source has no matching artwork.

## Deployment order

1. Apply the new `supabase/migrations/20261003_correct_october_mount_tiers.sql` migration. If earlier October migrations have not been installed, apply `20261001_october_mount_bonuses.sql`, then `20261002_october_single_mount_rules.sql`, then the new `20261003` correction before reopening purchases. Existing September, dual-server and fulfillment migrations are prerequisites. Do not rerun older migrations after the latest correction, as they contain superseded rules.
2. Deploy the updated edge functions: `submit-donation`, `paypal-checkout`, `recover-paypal-payment`, and `update-donation-discord-status`.
3. Build and deploy the frontend using the existing production environment configuration (`npm ci`, then `npm run build`).

Apply the database migration before the functions and frontend so purchases use the new entitlement rules. If the previous update is already deployed, only `submit-donation` and `update-donation-discord-status` changed in this revision; the full source also includes the prior October checkout and recovery support. No credentials, real payment tests or deployment are included in this archive.

## Bonus handling

- A payment verification timestamp is authoritative. A verified order awaiting fulfillment counts; an unverified order or an order already rejected at first verification does not.
- The $500 and $1,000 October tiers use the same Tiger reservation key. Buying both, buying multiple quantities or retrying payment verification cannot grant a second Tiger on the same server. V1 and V2 remain independent.
- $50 and $100 packages do not qualify even when their quantities total $500, $1,000 or $2,000. There is no separate cumulative mount reward.
- Existing valid Tiger reservations are preserved. Previously verified $1,000 purchases are backfilled; if an eligible package was already delivered, staff should deliver the new supplemental Tiger separately. The migration records the entitlement without changing the original delivery evidence.
- Mistaken $100 reservations on undelivered orders are archived in `october_mount_rule_corrections` and released so a qualifying $500/$1,000 order can receive the Tiger. Their generated Tiger fulfillment text is cleared. Completed prior $100 reservations are retained to prevent duplicate delivery; staff should reconcile any such historical cases using the delivery evidence.
- Retired-mount eligibility and known automatically generated retired-mount suffixes are cleared from outstanding orders. Completed delivery evidence and historical claim ledger entries are retained. Retained retired-mount ledger entries are audit records, not current fulfillment instructions.
- The old cumulative purchase tables are retained for audit purposes but are no longer updated or used for new rewards.
- As with the existing September system, existing reservations are retained if an order is later rejected or verification is cleared. Refunds, identity corrections or entitlement reversals require explicit staff reconciliation.

## Verification

Verified the production build and TypeScript check, reward/catalog/checkout/notification/admin checks, eight local PostgreSQL correction tests, and browser scenarios covering V1/V2 at desktop/mobile sizes, including qualifying and nonqualifying checkout notices.

The current PostgreSQL tests run the actual migration sequence in an isolated PGlite database, covering both eligible tiers, shared entitlement, excluded tiers and quantities, archived mistaken $100 claims, past $1,000 purchases, existing Tiger claims, preserved completed evidence, retries and migration idempotency. The older `october-bonuses-db.cjs` and `october-single-mount-db.cjs` remain regression tests for their historical migration versions only. PGlite serializes one session; separate simultaneous PostgreSQL connections were not tested. Browser payment/database calls are mocked or blocked.

Run the standard tests with Node 22.18 or newer:

```powershell
npm ci
node node_modules/typescript/bin/tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

Additional QA tools can be installed separately, without changing production dependencies:

```powershell
npm install --prefix ../qa @electric-sql/pglite@0.5.8 @playwright/test@1.63.0
$env:NODE_PATH = (Resolve-Path ../qa/node_modules).Path
node --test tests/october-eligibility-correction-db.cjs
```

For the browser tests, run a local preview with fake settings in a separate terminal:

```powershell
$env:VITE_SUPABASE_URL = 'https://local-tests.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'local-test-key'
$env:VITE_PAYPAL_CLIENT_ID = 'local-test-client'
npm run dev -- --host 127.0.0.1 --port 4173
```

Then, with `NODE_PATH` still pointing at the isolated QA tools, run `node tests/browser-october.cjs` and `node tests/browser-checkout.cjs`. The scripts use the installed Microsoft Edge browser. Screenshots and test results are written to the configured QA artifacts directory.
