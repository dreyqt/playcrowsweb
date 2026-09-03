# Admin PayPal Recovery Tool

This update adds an admin-only **Recover PayPal Payment** tool to the Donation Admin Dashboard.

## What it does

1. Admin selects PlayCrows V1 or V2.
2. Admin enters either the PayPal Order ID or PayPal Capture/Transaction ID.
3. The Edge Function authenticates the logged-in admin against `admin_users`.
4. It verifies the payment directly with PayPal and requires a COMPLETED capture.
5. It reconstructs Server, Player ID, Username, Package, Quantity and Amount from the original PlayCrows PayPal order metadata.
6. It blocks duplicate PayPal Order/Capture IDs already present in `donations`.
7. It creates a verified `pending` donation record so normal fulfillment evidence can be attached in the Admin Dashboard.

## Deploy

Deploy the new Edge Function:

`recover-paypal-payment`

It uses the same existing PayPal secrets as normal checkout:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` (only if you use sandbox)

It also uses Supabase's standard Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No new SQL migration is required for this feature because it uses the existing donation/payment verification columns.

## Security

The recovery endpoint requires a valid Supabase user access token and confirms that the user exists in `public.admin_users`. The service-role key never reaches the browser.
