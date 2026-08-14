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
