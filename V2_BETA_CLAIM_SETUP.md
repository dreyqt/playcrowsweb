# PlayCrows V2 Beta Claim Setup

1. Open Supabase → SQL Editor.
2. Run or rerun `supabase/migrations/20260902_v2_beta_claim_event.sql`.
3. Deploy the website to Vercel.
4. Open `/v2-beta-claim` on your website.

The protected review dashboard is available at `/admin/v2-beta-claims`. Sign in
with the same authorized Supabase administrator account used by the existing
PlayCrows admin pages. It provides separate event counters, filters, search,
proof links, private Invite Tracker screenshots, and approve/reject actions.
Proof URLs are normalized and compared across different Player IDs while a
claim is pending or approved. Matching active claims are marked with their
conflicting reference codes, and approval is blocked when a matching link
already belongs to an approved claim. Rejected claims are removed from these
security checks and can be corrected and submitted again, even on the same day.

## Promotional post for KO / TW / RU

These languages display a complete localized V2 server announcement with a
one-click copy button. Players publish the entire announcement on five different
active promotional/community sites and submit the direct links to those posts.

Claims and proof links are saved privately in `v2_beta_claims`. Invite Tracker images are stored in the private `v2-beta-proofs` Storage bucket. Administrators can review claims in the Supabase Table Editor and view images through Storage.

The public claim page has separate **Submit Claim** and **Results** tabs, so
players do not have to scroll through the form to check results. The Results tab
displays only the Discord ID, selected event, processing status, and the public
rejection reason when a claim needs correction. Player IDs, nicknames, proof
links, and reference codes remain private.

## Disable after the beta test

```sql
update public.v2_beta_claim_settings
set enabled = false, updated_at = now()
where id = true;
```

This closes the public claim page immediately without deleting submissions or proof images. Change `false` to `true` to reopen it.
