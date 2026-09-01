# PlayCrows V2 Beta Claim Setup

1. Open Supabase → SQL Editor.
2. Run `supabase/migrations/20260902_v2_beta_claim_event.sql` once.
3. Deploy the website to Vercel.
4. Open `/v2-beta-claim` on your website.

Claims and proof links are saved privately in `v2_beta_claims`. Invite Tracker images are stored in the private `v2-beta-proofs` Storage bucket. Administrators can review claims in the Supabase Table Editor and view images through Storage.

## Disable after the beta test

```sql
update public.v2_beta_claim_settings
set enabled = false, updated_at = now()
where id = true;
```

This closes the public claim page immediately without deleting submissions or proof images. Change `false` to `true` to reopen it.
