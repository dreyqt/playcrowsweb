# Mount pre-order update — price revised 14 November 2026

The source update adds a Mount Pre-order tab, a shop promotion, checkout information, the three supplied mount images, and all 35 NEW STATS. Labels and rules support all six existing languages. The old statistics printed on the screenshots are hidden by the artwork viewport.

| Step | Mount | Additional spending | Total to unlock |
| --- | --- | ---: | ---: |
| 1 | Rodrigo's Flame Horse | $500 | $500 |
| 2 | Supreme Conqueror's Qilin | $1,000 | $1,500 |
| 3 | Golden Jackal of Ramses II | $1,500 | $3,000 |

All current gift packages count. Mounts are bonuses, with no separate mount product or payment. Ordinary package contents remain included. A larger purchase can complete multiple steps, including every earlier step. Each account can earn each mount once.

## Publishing and launch

Publish the updated source to the existing Vercel website using your normal deployment process to display the new price. This task updated the local repository; it did not deploy the frontend or push Git changes. The existing campaign is already active and does not need to be launched again.

Both database updates are **already installed** in the connected `playcrows-donations` project (`hicrkrhhfhvjgpwpifde`): original setup `20261111143850_mount_preorder_bonus` and price reduction `20261113180731_reduce_mount_preorder_step_three_price`. Do not run them again on that project. Migration filenames match the versions returned by Supabase after application; each was initially generated using the Supabase CLI. No Edge Function redeployment is required.

Live verification after the price reduction: step prices are $500 / $1,000 / $1,500 and unlock totals are $500 / $1,500 / $3,000. The campaign remains active with its original launch time (11 November 2026, 23:14 Singapore time). All 631 existing orders are preserved. Any account already credited with $3,000 or more qualifies immediately, with existing reservations and recorded deliveries preserved. At the time of this update, no accounts had mount purchase credits yet.

The English and Korean Discord graphics were updated as new `-v2.png` versions; the previous graphics were retained.

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
- 18 targeted unit and isolated database checks passed, including the $3,000 boundary, existing-account qualification, repeat application, launch-date preservation and delivery preservation.
- Eight browser checks passed: desktop/mobile exact stats, Korean, manual/PayPal checkout, prelaunch state, unavailable-status fallback, and admin launch/delivery. Payments and submissions were mocked; no real payment or mount delivery was performed.
- Live checks confirmed private reward data is protected, and public visitors can only read campaign status. No new security/performance warnings or errors were introduced; informational notices concern deliberately private tables and unused indexes before launch.
- The initial setup identified six pre-existing TypeScript translation errors in the unused `OctoberBonusNotice.tsx`; that unrelated file remains outside this price update.

The price-update archive contains only changed/new source, tests, documentation and migration. It excludes credentials, dependencies, and the local preview build. Discord graphics are supplied separately.
