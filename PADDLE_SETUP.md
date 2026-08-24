# PlayCrows Paddle Checkout Setup

This build replaces the PayPal payment option in the public checkout with Paddle.
GCash, Wise, and Bybit remain available.

## 1. Create a Paddle client-side token

In the Paddle Sandbox dashboard:
Developer tools -> Authentication -> Client-side tokens -> New client-side token

Add the token to Vercel as:

- `VITE_PADDLE_CLIENT_TOKEN` = your `test_...` token
- `VITE_PADDLE_ENV` = `sandbox`

Do not put a Paddle API key in any `VITE_` variable.

## 2. Configure Paddle checkout

In Paddle Sandbox, configure a default payment link under Checkout settings.
The 18 Sandbox price IDs are mapped in `src/paddleCatalog.ts`.

## 3. Supabase database

Run:

`supabase/migrations/20260825_add_paddle_checkout.sql`

This adds Paddle checkout and transaction reference columns without removing old PayPal history.

## 4. Deploy the updated submit-donation Edge Function

Deploy:

`supabase/edgefunction/submit-donation/index.ts`

Paddle submissions store the checkout and transaction IDs and prevent the same transaction ID from being submitted twice.
Payment still requires a receipt/screenshot and remains subject to manual verification/fulfillment in the admin dashboard.

## 5. Sandbox test

Use a Paddle Sandbox card such as `4242 4242 4242 4242`, any future expiry, and security code `100`.
After `checkout.completed`, the site records the Paddle transaction ID and advances to receipt upload.

## Going live later

Live Paddle products/prices have different IDs from Sandbox. Before switching `VITE_PADDLE_ENV` to `live`, create the Live catalog and replace the mappings in `src/paddleCatalog.ts` with the Live `pri_...` IDs, then use a `live_...` client-side token.
