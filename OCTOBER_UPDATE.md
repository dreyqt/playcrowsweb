# October webshop update

Updated from the supplied `playcrowsweb.zip`. The live website and database have not been changed.

## Included changes

- Removed August packages from V1 and from active checkout/submission validation. Historical August orders remain readable and recoverable.
- Both V1 and V2 now show the same category tabs, in order: Currency, Support Packages, September Supply Packages, October Packages.
- Added the $50, $100, $500 and $1,000 October packages to both servers using the latest revised lists. All 73 reward entries and quantities are included in the supplied order. Item #12080765 is named **Torn Invoices (Attribution)** as confirmed by the user.
- Reused the September event-bonus badge and once-per-player/server behavior for the $500 mount **The White Tiger of Manouille I** and the $1,000 mount **Balian's Battle Griffin**.
- Added **Nureddin's Red Death** for $2,000 accumulated exclusively through verified October package purchases by the same Player ID on the same server. Any mixture of October tiers and quantities counts. Currency, support and September purchases do not count.
- Added admin fulfillment details, payment catalogs and notification formatting for October mounts. The database reserves eligibility; the existing staff fulfillment process delivers the mounts.
- Added October UI translations for all six existing languages. Existing missing-item icon fallbacks are used where the supplied source has no matching artwork.

## Deployment order

1. Apply `supabase/migrations/20261001_october_mount_bonuses.sql` to the existing database. It depends on the existing September bonus and dual-server migrations. It is safe to rerun and backfills already-verified October orders in verification order.
2. Deploy the updated edge functions: `submit-donation`, `paypal-checkout`, `recover-paypal-payment`, and `update-donation-discord-status`.
3. Build and deploy the frontend using the existing production environment configuration (`npm ci`, then `npm run build`).

Apply the database migration before the functions and frontend: they read the new October eligibility columns. No credentials, real payment tests or deployment are included in this archive.

## Bonus handling

- A payment verification timestamp is authoritative. A verified order awaiting fulfillment counts; an unverified order or an order already rejected at first verification does not.
- Package mounts and the $2,000 mount each have separate once-per-player/server reservations. For example, two $1,000 orders award the Griffin on the first order and Red Death on the second.
- Repeated verification or migration runs do not count the same order twice. Atomic database updates serialize totals for the same player/server, and unique constraints prevent duplicate mount reservations.
- As with the existing September system, verified credits and reservations are retained if an order is later rejected or verification is cleared. Refunds, identity corrections or entitlement reversals require an explicit staff reconciliation; this patch does not introduce automatic clawbacks.
- The admin total shown on an order is the snapshot at its first verification, not the player's current live balance.

## Verification

Passed the production build and TypeScript check, exact reward/catalog tests, mocked checkout and notification tests, admin fulfillment helper tests, local PostgreSQL migration tests, and browser checks for both versions at desktop and mobile sizes. Existing checkout tests also pass.

The PostgreSQL tests run the actual migrations in an isolated PGlite database; they cover threshold boundaries, mixed tiers, quantities, player/server isolation, rejected and unverified orders, backfill, retries and access rules. PGlite serializes one session; separate simultaneous PostgreSQL connections were not tested. All browser payment/database calls are mocked or blocked.

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
node --test tests/october-bonuses-db.cjs
```

For the browser tests, run a local preview with fake settings in a separate terminal:

```powershell
$env:VITE_SUPABASE_URL = 'https://local-tests.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'local-test-key'
$env:VITE_PAYPAL_CLIENT_ID = 'local-test-client'
npm run dev -- --host 127.0.0.1 --port 4173
```

Then, with `NODE_PATH` still pointing at the isolated QA tools, run `node tests/browser-october.cjs` and `node tests/browser-checkout.cjs`. The scripts use the installed Microsoft Edge browser. Screenshots and test results are written to the configured QA artifacts directory.
