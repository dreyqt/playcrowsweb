# Official Night Crows player research

Player form: `/research`. Staff review: `/admin/research`.
The feature uses the existing Supabase project and administrator accounts.

## Staff workflow

1. Sign in to Research Admin with an existing PlayCrows administrator account.
2. Check a prospective contributor through your usual Discord contact. Ask for evidence that they have played official Global or Korean Night Crows.
3. Create a named invitation and privately copy its code to that player. Each code allows one submission, expires after 14 days, and can be revoked before use. The full code is displayed only when created; create a replacement if it is lost.
4. The player opens `/research`, enters their official-server profile, adds entries from the supplied research tables, attaches a character screenshot, and submits with the code.
5. Open the pending submission. Inspect character/server evidence and open every citation. Compare dates, region, skill values, and uncertainty notes before approving. Record a reason for approval or rejection. Approval is a staff judgement, not automatic game-account verification.
6. Download the selected submission as JSON for further research. Submission details and screenshots are private to administrators; approved records are not automatically published.

## What is preserved

All 26 research tables, column labels, and template rows from `Night_Crows_New_Class_Research_EN.html` are available in the topic selector. Contributors may send up to 30 entries per invitation. Staff assignment tracking remains in the downloadable original template. Contributor-entered verification claims do not grant approval.

## Security model

- Invitation codes are generated with cryptographic randomness and stored as hashes. Possession of a code allows submission; share it only with its intended recipient.
- The server validates entries, official region, profile dates, evidence type/size, and source links. A private PNG, JPEG, or WebP character screenshot is required.
- Submission and invitation use are committed together. Repeated identical requests return the original receipt; reused, revoked, expired, or changed requests cannot create additional records.
- The database denies direct anonymous and signed-in client access to research tables. All administration verifies the current session and the existing `admin_users` membership on the server.
- Evidence is kept in the private `research-evidence` bucket. Only verified administrators receive short-lived viewing links.
- New entries always start pending. Review actions record the authenticated reviewer and a review note; stale review changes are rejected.
- Invitations and attempt limits reduce random submissions. They cannot establish whether a screenshot or claim is true; staff review remains necessary.
- No game passwords, payment details, or new administrator credentials are requested.

## Deployment

The website deploys from the existing GitHub/Vercel project. It uses the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` already required by the shop.

Deploy the checked-in research database migration and the `research-api` Supabase Edge Function before publishing the website. The function disables the gateway JWT check because public contributors use invitation codes; every administrator action still validates a real Supabase session server-side. Never put a service key in the browser or repository.

The original HTML template is served as a download with a sandbox response policy so it cannot execute in the website's origin. Do not remove those response headers.

For a different website domain, update the function's exact allowed-origin list. No existing donation tables, payment functions, or reward processing are changed by this feature.

## Verification

Research API tests: `node --test tests/research-backend.test.mjs`.
Browser checks: `tests/browser-research.cjs` and `tests/browser-research-admin.cjs` use mocked external requests and cover desktop/mobile layouts, privacy, safe retry, review decisions, and administrator access. Point `PLAYWRIGHT_MODULE_PATH` to an installed `@playwright/test` when it is not in the project's module search path.

`tests/research-db-check.sql` validates the live database functions and privileges inside a transaction that rolls back its test records. The production build passes. The full-project TypeScript check still reports six pre-existing missing translation-key errors in the unused `OctoberBonusNotice.tsx` component; there are no research-feature type errors.
