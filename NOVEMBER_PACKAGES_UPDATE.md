# November packages and merged shop — November 6, 2026

## Website changes

- The public shop opens directly into V1. The server selection screen and change-server controls have been removed.
- November Packages is the first/default shop category, with $50, $100, $200, $500 and $1,000 tiers and labels in all six supported languages.
- All 174 supplied reward entries are included: 34 items in each of the first three tiers and 36 items in each of the last two tiers. Formatting is consistent across packages.
- The $200 Shining Accessory Enhancement Scroll Chest quantity is **3,000**, as confirmed. The $500 Star's Memory quantity remains 3,000 as supplied.
- The $500 package includes Golden Necklace Insignia ×4 and Golden Ring Insignia ×8. The $1,000 package includes ×12 and ×24 respectively. These are ordinary package contents and multiply with the selected quantity.
- November packages use ordinary V1 pricing, quantities and cumulative credit. Existing V1 event reward selections continue through checkout. Boosting-specific bonuses and purchase limits apply only to Boosting packages.
- Checkout, payment verification, recovery, administrator category labels and donation notification labels recognize November packages. Existing V1 package categories remain available.

## V2 retirement

- The public Event Center shows V1 events. Old explicit V2 event links and the V2 beta-claim route open the merged event list.
- The migration ends and unpublishes V2 events, removes V2 events/results and bonus catalogs from public access, blocks new V2 event claims, and disables the separate V2 beta claim entry points.
- New V2 PayPal orders, unpaid captures and manual purchase submissions are closed. Stale clients receive a message directing them to V1.
- Existing V2 donations, event claims and beta claims remain available to administrators. Already completed provider payments remain recoverable; old payment records and fulfillment history are preserved.
- This update changes the webshop and its event access. It does not move historical orders between accounts or servers.

## Deployment

The updated source is saved locally in `D:\justi\Documents\GitHub\darkcrows\playcrowsweb`. No live deployment has been performed.

Use a short checkout maintenance window and allow in-progress requests to finish so old V2 payment handlers cannot create new orders during the rollout.

1. Apply `supabase/migrations/20261106_merged_server_events.sql` to the existing Supabase project using its normal migration process. It expects the repository's existing donation and event schema. The optional beta system is disabled only when present.
2. Deploy the four updated function sources from the existing `supabase/edgefunction/` folder: `paypal-checkout`, `submit-donation`, `recover-paypal-payment` and `update-donation-discord-status`.
3. Build and deploy the website through its existing Vercel workflow, then reopen checkout.

Keep the existing environment variables, including V2 provider credentials needed for historical payment verification/recovery. No new environment variables are required. The database migration and function changes are required to retire stale V2 checkout and event access; deploying only the frontend changes the visible interface.

## Validation and files

- Production build passed.
- Unit and edge-handler regressions passed, including exact rewards, trusted November prices, payment verification, V2 retirement and completed-payment recovery.
- The merge migration passed isolated PostgreSQL checks covering public access, V1 claims, V2 claim rejection, beta shutdown, historical/admin records, completed payments and safe reruns.
- Ten browser scenarios passed on desktop/mobile, including all 174 rendered rewards, multiple quantities, manual/PayPal checkout, Korean text and retired V2 links.
- Payment and notification tests used mocks. Database tests ran locally; no live payment, claim, database change or Discord notification was sent.
- Full TypeScript checking still reports six pre-existing translation-key errors in the unused `src/components/OctoberBonusNotice.tsx`. That component is unchanged; the production build succeeds.

The update archive contains only changed/new source, migration, tests and this note, relative to the source supplied on November 6. It excludes credentials, dependencies and local preview build output. Backups of replaced original files are retained in the task workspace.
