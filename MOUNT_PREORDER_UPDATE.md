# Mount pre-order update — 11 November 2026

The source update adds a Mount Pre-order tab, a shop promotion, checkout information, the three supplied mount images, and all 35 NEW STATS. Labels and rules support all six existing languages. The old statistics printed on the screenshots are hidden by the artwork viewport.

| Step | Mount | Additional spending | Total to unlock |
| --- | --- | ---: | ---: |
| 1 | Rodrigo's Flame Horse | $500 | $500 |
| 2 | Supreme Conqueror's Qilin | $1,000 | $1,500 |
| 3 | Golden Jackal of Ramses II | $2,000 | $3,500 |

All current gift packages count. Mounts are bonuses, with no separate mount product or payment. Ordinary package contents remain included. A larger purchase can complete multiple steps, including every earlier step. Each account can earn each mount once.

## Publishing and launch

1. Publish the updated source to the existing Vercel website using your normal deployment process. This task updated the local repository; it did not deploy the frontend or push Git changes.
2. Open `/admin` on the updated website and choose **Launch mount pre-orders**. Confirm the launch when ready. This sets the start time once; repeated clicks cannot reset it. Until then, the website shows **Coming soon** and purchases do not count.

The database update is **already installed** in the connected `playcrows-donations` project (`hicrkrhhfhvjgpwpifde`), migration `20261111143850_mount_preorder_bonus`. Do not run it again on that project. The checked-in migration filename matches the version returned by Supabase after application; it was initially generated using the Supabase CLI. No Edge Function redeployment is required.

Launch has deliberately not been activated before the frontend is published. Live verification after installation: campaign inactive, no start time, zero mount purchase credits and reservations; all 631 existing orders and 365 payment verifications remained unchanged.

## Tracking and delivery

- Only orders created after launch whose payment is verified after launch count. Older PayPal captures recovered later are excluded.
- Progress uses the trusted USD package price × quantity after discounts, grouped by normalized Login ID. The previous V2 cumulative multiplier does not apply.
- Payment retries and repeated reviews cannot credit the same order twice. Provider receipt IDs prevent duplicate PayPal/Paddle credit. Unsupported products and V2 orders do not earn credit.
- In `/admin`, review any V1 order to see that account's total, remaining spending, and reserved mounts. Save payment verification before refreshing progress.
- Deliver normal package contents as usual. Mounts remain reserved until an administrator separately chooses **Record mount delivery**, in step order. No delivery date is assumed.
- Verified spending receipts are retained for audit. Later review edits, deletion, or rejection do not automatically reverse an earned mount. Exceptional refunds or corrections require an audited database reconciliation before delivery.
- When adding future gift packages, update the private mount package-price catalog in a new migration. A test checks that the current catalog covers every purchasable package.

## Validation

- Production build passed.
- 117 unit and isolated database checks passed, including existing Boosting and merged-server behavior.
- Eight browser checks passed: desktop/mobile exact stats, Korean, manual/PayPal checkout, prelaunch state, unavailable-status fallback, and admin launch/delivery. Payments and submissions were mocked; no real payment or mount delivery was performed.
- Live checks confirmed private reward data is protected, and public visitors can only read campaign status. No new security/performance warnings or errors were introduced; informational notices concern deliberately private tables and unused indexes before launch.
- TypeScript still reports six pre-existing translation errors in the unused `OctoberBonusNotice.tsx`; the new mount code adds no type errors.

The update archive contains only changed/new source, tests, documentation, migration, and supplied images. It excludes credentials, dependencies, and the local preview build.
