# PlayCrows PayPal Checkout Switch

This build removes Paddle from the public payment-method selector and restores PayPal Standard Checkout. Existing historical Paddle records and backend fields are intentionally retained.

## 1. Create a REST app in the NEW PayPal Business account

In the PayPal Developer Dashboard while signed into the Business account that will receive the funds, create a Live REST app. Copy the Live Client ID and Live Secret. Do not put the secret in Vercel.

## 2. Vercel

Set this public frontend variable:

```
VITE_PAYPAL_CLIENT_ID=<NEW BUSINESS ACCOUNT LIVE CLIENT ID>
```

You may remove/disable the old `VITE_PADDLE_CLIENT_TOKEN` and `VITE_PADDLE_ENV` from the frontend after the PayPal deployment is confirmed.

## 3. Supabase Edge Function secrets

Set these secrets to the credentials from the SAME new PayPal Business REST app:

```
PAYPAL_CLIENT_ID=<NEW BUSINESS ACCOUNT LIVE CLIENT ID>
PAYPAL_CLIENT_SECRET=<NEW BUSINESS ACCOUNT LIVE SECRET>
PAYPAL_ENV=live
```

Never expose `PAYPAL_CLIENT_SECRET` in Vercel or frontend code.

## 4. SQL

Run:

```
supabase/migrations/20260825_paypal_checkout_return.sql
```

## 5. Edge Functions

Redeploy/update these functions in Supabase:

- `paypal-checkout` from `supabase/edgefunction/paypal-checkout/index.ts`
- `submit-donation` from `supabase/edgefunction/submit-donation/index.ts`

`paypal-checkout` creates and captures the PayPal order using server credentials. `submit-donation` then fetches the PayPal order directly from PayPal again and verifies the capture ID, player/character custom ID, USD amount, and completion status before saving the donation.

## 6. Test

Use the $5 package first. Confirm:

1. PayPal buttons render.
2. PayPal shows the new Business merchant at checkout.
3. Payment completes.
4. PlayCrows jumps directly to Review (no receipt upload for PayPal).
5. Submit succeeds.
6. Discord shows `PAID · Pending Fulfillment` and `Server-verified directly with PayPal`.
7. The capture appears in the NEW Business PayPal account.

GCash, Wise, and Bybit still require receipt upload.
