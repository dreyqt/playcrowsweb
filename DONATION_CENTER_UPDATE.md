# Donation center update — September 6, 2026

## What changed

- Added three Support Packages to the available V1 donation shop: Change Character Name ($200), Intermediate Codex ($100), and Blessing EXP ($100).
- Added all supplied rewards and quantities. Standardized “Contribution: Coin” to the existing display name “Contribution Coin”.
- V2 remains disabled and marked Coming Soon on the donation server selector. Its separate packages will be configured when supplied; the existing inactive internal V2 catalog is retained for now.
- Moved NEW badges from Alchemy Pack, NC Gears Starter, and 4th Job Advance Pack to the three new packages. New packages appear first in Support Packages.
- Added a Heroic Skills event notice above the shop categories, plus a short reminder on the amount/quantity step. English and Korean copy are included; other languages use the existing English fallback for this notice.
- The notice explains: $300 in a single transaction qualifies for New Heroic Passive Skills; after that, another $200 from the same player qualifies for Heroic Skill Enhancement II & III. Separate smaller payments cannot satisfy the first $300 requirement. Each reward can be claimed only once per player, and the qualifying $300 transaction must be completed before the additional $200 purchase. Earlier $200 purchases do not count. Further purchases do not reset the event.
- September packages are explicitly excluded from both requirements. Their existing separate bonuses are preserved.
- Updated the PayPal checkout, donation submission, and PayPal recovery catalogs to recognize the new package IDs and prices.
- Fixed stale package lookups when switching servers, removed duplicate icon mappings/unused imports, and added a message when an admin tries to open a submission without a receipt.
- Repaired the existing package-lock.json mismatch so clean dependency installation succeeds.

## Apply the update

1. Replace your website source with the contents of this folder, keeping your existing environment variables and deployment settings.
2. In Supabase, deploy the updated code for these THREE Edge Functions from the corresponding files:
   - paypal-checkout: supabase/edgefunction/paypal-checkout/index.ts
   - submit-donation: supabase/edgefunction/submit-donation/index.ts
   - recover-paypal-payment: supabase/edgefunction/recover-paypal-payment/index.ts
3. Deploy the website using your usual hosting workflow. For a local build, run npm ci followed by npm run build.

Deploy the Edge Functions before making the new website catalog available, otherwise the live backend may reject new package selections.

No new Supabase SQL or database migration is required for this update. Existing configuration, payment credentials, database setup, and September bonus-claim protections remain in use.

## Event placeholder scope

This is an informational event notice. It does not automatically calculate eligibility, track the additional $200, prevent repeat claims, or deliver rewards. Confirm the same player's qualifying transactions before handling claims through your existing process. The displayed one-time limit and purchase order are the event rules; this placeholder does not enforce them automatically. No event dates or claim links have been added.

Edit the notice text in src/i18n.tsx (heroicBonus keys), and its layout in src/components/HeroicBonusNotice.tsx. Package content is in src/giftPackageData.ts. Keep the three backend catalogs synchronized when changing IDs, titles, or prices.

Some newly listed items do not have matching artwork in the supplied source. They use the existing letter-icon fallback; reward names and quantities still display. Add matching images to public/images when available.

## Verification

- TypeScript check: passed.
- Production build: passed (existing large-bundle advisory remains).
- Checked both server catalogs for unique IDs, exactly three NEW packages, reward counts, and matching titles/prices across all three backend catalogs.
- No live payments were made and no production deployment was performed.

The archive includes the website source and existing assets. Git history, installed dependencies, and generated build output are omitted.

## Follow-up clarification

Only the bonus notice and these notes changed after the initial updated ZIP. If you already deployed that version, redeploy the website for this clarification; there are no further Edge Function or SQL changes. If upgrading from the original source, deploy the three updated functions listed above as well.
