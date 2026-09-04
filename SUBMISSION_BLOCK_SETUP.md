# Submission Block / Timeout setup

1. Run `supabase/migrations/20260905_submission_blocks.sql` in the Supabase SQL Editor.
2. Redeploy the `submit-donation` Edge Function.
3. Redeploy the website/admin frontend.

## Behavior
- New submissions record a SHA-256 hash of the request IP (the raw IP is not stored) and a browser-local device ID.
- In Admin > Review, use Block 1 Hour / 24 Hours / 7 Days / Permanent.
- A block is created for Player ID and, when available, the recorded IP hash and device ID.
- `submit-donation` checks restrictions before receipt upload/database insertion.
- Unblock disables matching active restrictions.
- Existing historical donations will not have IP/device identifiers, so blocking one of those records initially blocks Player ID only. New submissions capture all available identifiers.
- Browser device IDs are not hardware IDs and can be reset by the user. IP + Player ID provide additional coverage.
