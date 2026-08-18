# PlayCrows PayPal Standard Checkout Setup

This update replaces the PayPal Hosted Button with PayPal Standard Checkout backed by Supabase Edge Functions.

## What changes for players

- The Donation Center already knows the PlayCrows Username and Character Name from Step 2, so PayPal does not ask for them again.
- The selected package, quantity, player identifiers, and exact USD amount are sent to the server automatically.
- PayPal Checkout opens from the Donation Center and, after a successful capture, the website automatically continues to the receipt step.
- The PayPal capture ID is stored as the existing `paypal_transaction_id`, so Admin payment evidence is pre-filled automatically.
- Receipt upload remains enabled for the current manual fulfillment/evidence workflow.

## 1. Run the SQL migration

Run this file once in Supabase SQL Editor:

`supabase/migrations/20260819_paypal_standard_checkout.sql`

The migration is additive. It does not reset or change existing donations.

## 2. Add Supabase Edge Function secrets

In Supabase, add these secrets to the project/Edge Functions environment:

- `PAYPAL_CLIENT_ID` = the Live Client ID from the PlayCrows PayPal REST app
- `PAYPAL_CLIENT_SECRET` = the Live Secret from the PlayCrows PayPal REST app
- `PAYPAL_ENV` = `live`

Do not put `PAYPAL_CLIENT_SECRET` in Vercel, React, GitHub, Discord, or any frontend file.

Your existing Supabase secrets such as `DISCORD_DONATION_WEBHOOK_URL` remain unchanged.

## 3. Deploy Edge Functions

Deploy/create:

- `paypal-checkout` using `supabase/edgefunction/paypal-checkout/index.ts`
- overwrite the existing `submit-donation` function with the updated `supabase/edgefunction/submit-donation/index.ts`

The new `paypal-checkout` function creates and captures PayPal Orders on the server. The updated `submit-donation` function verifies the completed PayPal order with PayPal again before saving the donation.

## 4. Vercel environment variable

Keep the existing Vercel variable:

- `VITE_PAYPAL_CLIENT_ID` = your PlayCrows Live Client ID

This is used only to load PayPal's browser SDK. The secret remains server-side in Supabase.

After adding/changing Vercel variables, redeploy the website.

## 5. Frontend files changed

- `index.html`
- `src/types.ts`
- `src/App.tsx`
- `src/components/steps/StepPayment.tsx`
- `src/lib/submitDonation.ts`

## 6. Test checklist

1. Select a small PlayCrows package.
2. Enter the Username and Character Name in the normal Donation Center player-information step.
3. Select PayPal.
4. Confirm that there is no second Username/Character Name input.
5. Click the PayPal button and complete a live payment.
6. Confirm the Donation Center automatically moves to the receipt step after PayPal returns `COMPLETED`.
7. Upload the PayPal receipt and finish the normal submission.
8. In Admin, confirm the PayPal Transaction ID is already populated with the PayPal capture ID.
9. Confirm the donation is still pending manual fulfillment until staff processes it.

## Security behavior

- Package IDs and prices are validated server-side before a PayPal order is created.
- PayPal payments are created in USD for the exact package total.
- On final Donation Center submission, the server asks PayPal for the order again and verifies status, capture ID, player identifiers, currency, and amount.
- A unique database index prevents the same PayPal capture ID from being used for multiple donation submissions.
