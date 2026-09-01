# PlayCrows V1 / V2 Donation Center Setup

This build adds an explicit starting server selector and carries the selected
server through the donation, PayPal, Supabase, Discord, receipt-storage, admin,
and one-time event-bonus flows.

## 1. Run the Supabase migration

Run:

`supabase/migrations/20260901_dual_server_donation_center.sql`

Existing donation rows and September event-bonus claims are safely assigned to
`v1`. New rows store either `v1` or `v2`.

The September one-time event bonus is now unique by:

`server + normalized Player ID + bonus type`

This means a V1 claim cannot block the same Player ID's V2 entitlement, and a
second claim on the same server remains blocked.

## 2. Redeploy Supabase Edge Functions

Redeploy:

- `paypal-checkout`
- `submit-donation`
- `update-donation-discord-status`

## 3. PayPal configuration

Existing shared credentials still work:

- Vercel: `VITE_PAYPAL_CLIENT_ID`
- Supabase secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`

Optional fully separate PayPal accounts are supported:

- Vercel: `VITE_PAYPAL_CLIENT_ID_V1`, `VITE_PAYPAL_CLIENT_ID_V2`
- Supabase: `PAYPAL_CLIENT_ID_V1`, `PAYPAL_CLIENT_SECRET_V1`
- Supabase: `PAYPAL_CLIENT_ID_V2`, `PAYPAL_CLIENT_SECRET_V2`

Per-server values override the shared fallback.

## 4. Discord configuration

The existing `DISCORD_DONATION_WEBHOOK_URL` remains the fallback.

To use different donation channels per server, add Supabase secrets:

- `DISCORD_DONATION_WEBHOOK_URL_V1`
- `DISCORD_DONATION_WEBHOOK_URL_V2`

## 5. Package catalogs

Frontend catalogs are now available separately as `v1GiftPackages` and
`v2GiftPackages` in `src/giftPackageData.ts`.

The V2 catalog initially mirrors the current V1 catalog so both flows are fully
usable immediately. Replace/edit the V2 catalog when V2-specific package lists
are provided.

The two server-side catalogs in both checkout Edge Functions are also separate
(`V1_GIFT_PACKAGES` and `V2_GIFT_PACKAGES`). Keep frontend and server-side
pricing synchronized whenever a server's package list changes.
