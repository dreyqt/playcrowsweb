# PlayCrows V2 Beta Claim Setup

1. Open Supabase → SQL Editor.
2. Run `supabase/migrations/20260902_v2_beta_claim_event.sql` once.
3. Deploy the website to Vercel.
4. Open `/v2-beta-claim` on your website.

The protected review dashboard is available at `/admin/v2-beta-claims`. Sign in
with the same authorized Supabase administrator account used by the existing
PlayCrows admin pages. It provides separate event counters, filters, search,
proof links, private Invite Tracker screenshots, and approve/reject actions.
Proof URLs are normalized and compared across all Player IDs. When the same
link is submitted by a different Player ID, both claims are permanently marked
with their conflicting reference codes. The dashboard also blocks approval if
the matching link already belongs to an approved claim.

## Promotional link for KO / TW / RU

These languages ask players to copy one V2 link and publish it on five different
active promotional/community sites. Configure the exact link in Vercel:

```text
VITE_V2_PROMOTION_URL=https://your-v2-information-page.example
```

When this variable is not configured, the form uses the event link supplied for
the promotion: `https://www.facebook.com/share/p/1EsoFCFXef/`.

Claims and proof links are saved privately in `v2_beta_claims`. Invite Tracker images are stored in the private `v2-beta-proofs` Storage bucket. Administrators can review claims in the Supabase Table Editor and view images through Storage.

## Disable after the beta test

```sql
update public.v2_beta_claim_settings
set enabled = false, updated_at = now()
where id = true;
```

This closes the public claim page immediately without deleting submissions or proof images. Change `false` to `true` to reopen it.
