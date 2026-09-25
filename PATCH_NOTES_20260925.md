# Webshop patch — September 25, 2026

## Changes

- WEEKEND10 gives 10% off eligible packages in both V1 and V2 through September 27, 2026, 11:59:59.999 PM Singapore time (GMT+8). It expires at September 28 midnight GMT+8, or September 27 at 16:00 UTC. Frontend, PayPal checkout, donation submission, and PayPal recovery use the same deadline. Timely PayPal payments remain valid if the form is submitted or recovered after the deadline.
- The supplied archive already had September 27 promo dates. This patch makes the end-of-day boundary exact and checks the payment paths. Deploy the updated frontend and payment functions to apply it to the live webshop.
- Bonus selection is a dedicated page before final review. Every full $100 of total package value earns one complete event reward bundle; package quantity is included and promo discounts do not reduce this entitlement. A $500 package or five $100 packages earn five choices, even when WEEKEND10 reduces the payment to $450.
- Players can mix rewards, repeat a reward, add one bundle, assign all remaining choices to one bundle, remove a choice, or clear their choices. Each option lists the included items. A visible counter shows the choices used and remaining.
- Players must choose exactly their earned number of valid bundles before continuing. Missing or failed reward catalogs can be retried. Purchases below $100 receive an explanation and can continue without a bonus.
- Final review shows player details, server, package, payment, discount, and the chosen bonus names, quantities, and items per bundle. Players can go back to edit bonuses. Submission occurs only after the final review.
- New bonus instructions support English, Korean, Thai, Portuguese, Traditional Chinese, and Russian. Existing event titles and reward items continue to come from the server catalog.
- Corrected an existing Event Center type annotation so the full TypeScript check passes; runtime behavior is unchanged.

## Checkout flow

PayPal: package → player details → verified PayPal payment → bonus selection → review → submit.

GCash, Wise, and Bybit: package → player details → payment instructions → upload receipt → bonus selection → review → submit. Manual payments remain subject to the existing staff verification after submission; uploading a receipt does not automatically verify a payment.

## Deployment

1. Replace the existing project source with this patched source, preserving your deployment environment variables. Dependencies and the lockfile are unchanged.
2. Confirm the existing `supabase/migrations/20260922_donation_event_bonus_selection.sql` migration has already been applied. The new flow uses its existing server-side reward validation and snapshot storage. If it has not been applied, follow `DONATION_EVENT_BONUS_SELECTION_SETUP.md` for the original catalog/migration prerequisites. No new database migration is introduced by this patch.
3. Redeploy these Supabase Edge Functions from their matching files under `supabase/edgefunction/`: `paypal-checkout`, `submit-donation`, and `recover-paypal-payment`. They contain the matching promo deadline.
4. Build and deploy the frontend with the existing Supabase and PayPal environment variables. Standard commands: `npm ci`, then `npm run build`.

This delivery contains patched source, not a live deployment. `.git`, installed dependencies, and generated build files are excluded from the source archive. Existing assets and other source files are preserved.

## Verification

- Production build passed.
- TypeScript check passed: `npx tsc --noEmit`.
- Eleven rule and payment tests passed: `node --test tests/promo.test.mjs tests/event-bonus.test.mjs` (Node 22.18+).
- Four browser regression suites passed: manual $500 with WEEKEND10 and mixed choices; V2 PayPal to bonus/review on mobile; purchase below $100; five $100 packages with repeated choices, catalog retry, and submission retry.
- Desktop and 390px mobile layouts were checked. Browser tests used simulated catalogs and payments; no live purchase or submission was made.

Browser harness: `tests/browser-checkout.cjs`. Install `@playwright/test` in a separate QA folder and point `NODE_PATH` at that folder's `node_modules`, or use an existing installation. Run a local Vite server on port 4173 with `VITE_SUPABASE_URL=http://127.0.0.1:4173/mock-supabase`, `VITE_SUPABASE_PUBLISHABLE_KEY=local-test-key`, and `VITE_PAYPAL_CLIENT_ID=local-test-paypal`. Then run `node tests/browser-checkout.cjs`. The harness mocks payment/catalog/submission requests and blocks other remote requests; these placeholder settings are for local tests only.
