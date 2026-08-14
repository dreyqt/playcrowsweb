# PlayCrows Event Center Setup

The website now includes a reusable Event Center and Event Admin dashboard.

## 1. Run the Supabase migration

Open Supabase Dashboard → SQL Editor and run:

`supabase/migrations/20260814_event_center.sql`

This creates:
- `events`
- `event_submissions`
- secure `submit_event_claim(...)` RPC
- public-safe `event_public_results` view
- Row Level Security policies tied to the existing `admin_users` table

## 2. Deploy the website

Redeploy the project to Vercel after the migration succeeds. No new environment variables are required; it uses the existing Supabase URL and publishable key.

## 3. Open the pages

- Public Event Center: `/events`
- Players can use **Check Claim** with their `EV-...` reference to see Pending, Approved/Reward Sent, or Rejected status.
- Event Admin: `/admin/events`
- Existing Donation Admin: `/admin`

## 4. Publish an event

In `/admin/events`:
1. Click **+ New**.
2. Enter the event number, title, description, mechanics, rewards, dates, and status.
3. Add custom claim fields such as Proof Link 1, Proof Link 2, Facebook Post, or Community Link.
4. Set status to **Active / Published**.
5. Click **Create Event**.

Draft events remain invisible to players. Active and Ended events are visible on the public Event Center.

## 5. Review claims

Open an event in `/admin/events`. The Submission Review table shows the player, reference code, custom proof answers, and status.

- **Approve + Sent** marks the claim approved and records the reward as sent immediately.
- **Reject** asks for a rejection reason. Rejected players may submit again after correcting the problem.
- A player cannot create another claim while they already have a Pending or Approved claim for the same event.

## Notes

The public Results tab exposes only the Discord username, Approved/Rejected status, rejection reason, and reward-sent timestamp. Player IDs, character names, proof links/answers, reviewer identity, and admin notes remain private to admins.

## Event Center v2 upgrade

After the original Event Center migration, run:

`supabase/migrations/20260814_event_center_v2_security_links_translation.sql`

This upgrade adds:

- server-side duplicate-claim protection (Discord + Character + Player ID / UID)
- one-time or weekly claim limits
- configurable weekly reset day/hour/timezone
- server-side required-field and URL validation
- dynamic multi-link claim fields with minimum/maximum link counts
- required Character Name / Player ID switches
- Event Center language selector using the same saved language as the Donation Center
- optional localized title, descriptions, mechanics, rewards, and custom-field labels

For Event #001, recommended security settings are **One claim per week**, **Monday**, **04:00**, timezone **Asia/Manila**, with Character Name and Player ID / UID required. Add one **Multiple Links** field with minimum = 3 and maximum = 3.


## v3 update: Event Links / Action Buttons
If you already installed Event Center v2, run this additional migration in Supabase SQL Editor:

`supabase/migrations/20260814_event_center_v3_action_links.sql`

This adds configurable clickable action buttons to events. URLs inside Description, Mechanics, and Rewards are also automatically rendered as clickable links.

## v5 — Independent per-language event configurations

After deploying this version, run:

`supabase/migrations/20260815_event_center_v5_independent_locale_configs.sql`

This update makes each language's **Action Buttons**, **Dynamic Claim Fields**, and **Character/Player ID requirements** independent. For example, English Event #002 can link to Facebook and request Facebook proof, while Korean Event #002 can have no Facebook button and request Korean community links instead.

The event-wide claim frequency and weekly reset remain shared across languages. Duplicate protection also remains event-wide, so changing the website language cannot be used to claim the same event twice.

Existing translations are safely initialized from the current English claim configuration by the migration. After the migration, open **Admin → Events → Edit Event**, select the language tab, remove/change that language's action buttons and claim fields, then save the event.

## v6 - Dynamic field placeholders

No database migration is required for this update.

- Text and Long Text claim fields now use a text-answer placeholder instead of `https://...`.
- Single URL and Multiple Links fields continue to use a URL placeholder.
- Changing a custom field's type in Event Admin automatically resets its placeholder to the appropriate default.
- Event Admin now includes an optional **Placeholder** setting and **Help text** setting for every custom claim field.
- Text placeholder fallbacks are localized for EN, KO, TH, PT, Traditional Chinese, and RU.
