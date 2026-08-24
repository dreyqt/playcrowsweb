# Paddle Sandbox webhook setup

This update makes Paddle payment verification server-side. The browser's `COMPLETED` value is no longer trusted by itself.

## 1. Run the database migration

In Supabase SQL Editor, run:

`supabase/migrations/20260825_paddle_webhook_verification.sql`

This creates `public.paddle_transactions`, a service-role-only cache of signed Paddle `transaction.completed` events.

## 2. Deploy the Edge Functions

Deploy the new webhook **without JWT verification** because Paddle cannot send a Supabase JWT:

```bash
supabase functions deploy paddle-webhook --no-verify-jwt
```

Also redeploy the updated donation function:

```bash
supabase functions deploy submit-donation
```

If your local project uses `supabase/edgefunction/...` instead of the Supabase CLI's default `supabase/functions/...`, copy each `index.ts` into the corresponding function folder in your normal deployment workflow.

## 3. Create the Paddle destination

In Paddle Sandbox > Developer Tools > Notifications > New destination:

- Type: Webhook
- URL: `https://hicrkrhhfhvjgpwpifde.supabase.co/functions/v1/paddle-webhook`
- Description: `PlayCrows Paddle payment webhook`
- Usage type: Platform and simulation (or Both, if that is how the UI labels it)
- Event: `transaction.completed` only

Save the destination.

## 4. Store the webhook secret in Supabase

After saving the destination, Paddle shows/can reveal the destination secret. Do **not** put it in Vercel or frontend code.

In Supabase Edge Function secrets add:

```text
PADDLE_WEBHOOK_SECRET=<your destination secret>
```

Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.

## 5. Test

Make a new Sandbox Paddle checkout. After payment succeeds:

1. Paddle sends `transaction.completed` to `paddle-webhook`.
2. The webhook verifies `Paddle-Signature` against the raw request body.
3. It stores the verified transaction in `public.paddle_transactions`.
4. When the player submits the donation form, `submit-donation` checks that verified transaction and verifies its `game`, `package_id`, `player_id`, and `username` custom data.
5. The donation's `payment_verified_at` is set from the signed Paddle event.

If the form is submitted before the webhook arrives, the user gets a safe "wait a few seconds and submit again" message rather than trusting the browser.
