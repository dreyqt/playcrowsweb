# October webshop update — mount bonuses removed

This source update removes the entire October mount promotion from V1 and V2. The live website and database have not been changed.

## Included changes

- Removed the White Tiger bonus from the $500 and $1,000 October packages. No October tier or quantity grants a promotional mount.
- Removed the mount promotion notice from the webshop and checkout, along with its localized copy and October mount badges and reward labels.
- Removed mount fulfillment instructions from current admin views and donation notifications. Stale eligibility fields cannot restore a mount promotion.
- All four October packages remain available with the same 73 reward entries, prices and quantities, including Torn Invoices (Attribution).
- Both servers retain matching category tabs: Currency, Support Packages, September Supply Packages and October Packages. August remains removed from active purchasing.
- Normal package items, including mount summon items in other packages, September weapon-style bonuses and the existing event reward selection remain unchanged.

## Deployment order

1. Apply the new database migration: supabase/migrations/20261004_remove_october_mount_bonuses.sql.
2. Deploy the updated submit-donation and update-donation-discord-status edge functions.
3. Build and deploy the frontend using your existing production environment configuration.

If earlier October updates were never installed, apply the October migrations in sequence (20261001, 20261002, 20261003, then 20261004) before reopening purchases. The existing September bonus, dual-server and fulfillment schemas are prerequisites. Do not rerun an older migration after 20261004 because it contains superseded promotion rules.

The full archive also includes the earlier October payment catalog updates in paypal-checkout and recover-paypal-payment; deploy those if they are not already installed. No payment configuration or credentials are included.

## Existing orders and audit records

- All outstanding October orders lose their mount eligibility, whether their payment was already verified or still pending. Exact automatically generated mount suffixes are removed from outstanding delivery drafts.
- New October purchases, later verification, repeated verification and fulfillment-only edits cannot create or restore a mount entitlement.
- Completed delivery records are retained exactly as historical evidence. Existing mount claim ledgers and cumulative totals are retained for audit purposes only; they are not instructions to grant a reward.
- No new mount claims, cumulative credits or cumulative totals are created. Other package and September bonus handling is unaffected.

## Verification

Passed: production build, TypeScript, all 43 reward/catalog/checkout/notification/admin tests, all 8 local PostgreSQL retirement tests and all 4 V1/V2 desktop/mobile browser scenarios. Package cards, reward dialogs and checkout show no mount promotion; both servers retain matching tabs and exact package contents.

The current database suite is tests/october-no-mounts-db.cjs. It executes the full migration sequence and checks outstanding cleanup, completed-history preservation, all tiers and quantities, late payment verification, stale metadata on fulfillment edits, unchanged September rewards and idempotent migration reruns. Earlier database test files cover their historical migrations only.

Database tests run locally in PGlite; separate concurrent PostgreSQL sessions are not simulated. Browser payment/database calls are mocked or blocked, and no live payments, messages or deployments were performed.

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
node --test tests/october-no-mounts-db.cjs
```

For the browser tests, run a local preview with fake settings in a separate terminal:

```powershell
$env:VITE_SUPABASE_URL = 'https://local-tests.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'local-test-key'
$env:VITE_PAYPAL_CLIENT_ID = 'local-test-client'
npm run dev -- --host 127.0.0.1 --port 4173
```

Then, with `NODE_PATH` still pointing at the isolated QA tools, run `node tests/browser-october.cjs` and `node tests/browser-checkout.cjs`. The scripts use the installed Microsoft Edge browser. Screenshots and test results are written to the configured QA artifacts directory.
