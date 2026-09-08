# PlayCrows V2 Official Launch Web Shop Update

Launch time: **September 9, 2026 at 12:00 PM GMT+8 (Singapore Time)**  
UTC equivalent: **2026-09-09 04:00 UTC**

## Included changes

- PlayCrows V2 is enabled and clickable from the server-selection screen.
- V2 Web Shop contains **Diamond Packages only** ($5, $10, $50, $100, $200, $500, $1000).
- V1 packages and sections remain unchanged.
- V2 early top-up coupon: **V2EARLY10**
  - 10% discount
  - V2 only
  - Valid until September 9, 2026 at 12:00 PM GMT+8
  - Supported by PayPal and the existing manual payment methods.
  - PayPal verification checks that the discounted capture was actually completed before the deadline.
- V2 Event Center is separated from V1 and supports its own Event001.
- The Event Center 12-hour claim cooldown is scoped per server, so a V1 claim does not block a V2 claim.

## 1. Run the Supabase migration

Run this file in Supabase SQL Editor:

`supabase/migrations/20260908_v2_event_center_launch.sql`

The migration:

- adds `events.server` (`v1` / `v2`)
- assigns all existing events to V1
- changes event slug uniqueness to `server + slug`
- clones the latest existing V1 Event001 into V2 if V2 Event001 does not already exist
- sets the cloned V2 Event001 start time to the official V2 launch
- makes V1/V2 Event Center cooldowns independent

If no V1 Event001 exists when the migration is run, Supabase prints a notice and you can create V2 Event001 from Event Admin.

## 2. Redeploy Supabase Edge Functions

Redeploy these functions because their V2 package catalog and/or promo validation changed:

- `paypal-checkout`
- `submit-donation`
- `recover-paypal-payment`

No new PayPal secrets are required.

## 3. Redeploy the frontend

Redeploy the website to Vercel after the SQL migration and Edge Functions are updated.

## 4. Event Admin

Event Admin now includes a **Server** selector. Existing events appear as V1. V2 events can be edited independently even if they use the same slug/event number as V1.

Because Event001 is cloned from V1, review its action buttons/URLs in Event Admin after the migration and change any server-specific V1 link if needed.

Public Event Center links use:

- `/events?server=v1`
- `/events?server=v2`

## 5. V2 reward images

Existing image aliases are included for Black Wings, Sunset Mount/Weapon summons, Masarta Time Recharger, and Element Extraction of Harmony.

`Time Recharger Selection Chest (Bound)` does not currently have a matching image in `public/images`. The site will safely show its fallback icon. To add its custom icon later, use:

`public/images/time_recharger_selection_chest.png`
