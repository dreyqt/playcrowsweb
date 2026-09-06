-- MANUAL RESET ONLY — DO NOT ADD THIS FILE TO AUTOMATIC MIGRATIONS.
--
-- Purpose:
--   Wipe all V2 Beta Claim submissions/results while keeping the
--   V2 Beta Claim event, settings, functions, indexes, and permissions intact.
--
-- Effect:
--   * Results page becomes empty.
--   * Previous daily/player/Discord submission records are removed.
--   * Players can submit again after the reset.
--   * Uploaded files in the `v2-beta-proofs` Storage bucket are NOT deleted.

begin;

-- Optional safety check before deleting:
select count(*) as submissions_before_reset
from public.v2_beta_claims;

-- Wipe all beta claim submissions.
delete from public.v2_beta_claims;

commit;

-- Verify the reset.
select count(*) as submissions_after_reset
from public.v2_beta_claims;
