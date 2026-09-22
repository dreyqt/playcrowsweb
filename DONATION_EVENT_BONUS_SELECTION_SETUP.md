# Purchase Event Bonus Selection — September 22, 2026

## What changed

- Added a final-review Event Reward bonus selector for both servers.
- Entitlement is based on total package value: every $100 = 1 selection.
  - $100 = 1 selection
  - $200 = 2 selections
  - $500 = 5 selections
  - Package quantity is included in the total.
- Players may select the same Event Reward bundle more than once.
- V1 exposes EVENT001 through EVENT007.
- V2 exposes EVENT001 through EVENT006.
- Each event option shows its full reward list before the player submits.
- Removed the old V2 Event Bonus notice from the package amount step; V2 bonuses are now chosen during final review.
- The backend validates the number of selections and the selected event numbers before saving a donation.
- Saved donations keep a snapshot of the event title, reward list, and selected quantity.
- The Admin Dashboard displays the selected event bonuses and reward items.
- Discord donation notifications include a compact Event Bonus selection summary.

## Deployment order

1. Run `supabase/migrations/20260922_donation_event_bonus_selection.sql` in Supabase.
2. If V2 Event006 has not been created yet, run `supabase/migrations/20260922_v2_event006_multilanguage_client_promotion.sql`.
3. Redeploy the `submit-donation` Edge Function from `supabase/edgefunction/submit-donation/index.ts`.
4. Deploy the updated website source.

No PayPal checkout or PayPal recovery Edge Function redeploy is required for this specific selector update because the selection happens during the final donation submission step.

## Validation behavior

- Purchases below $100 must submit zero Event Reward selections.
- Eligible purchases must submit exactly the number of selections earned from the package value.
- V1 accepts only EVENT001–EVENT007.
- V2 accepts only EVENT001–EVENT006.
- Event reward names and item lists are loaded from the server's Event Center records rather than duplicated in frontend source.
