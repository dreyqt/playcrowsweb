# PayPal Discord field + Admin table alignment fix

## Why Discord showed Username: V1
No database migration was missing.

The V1/V2 checkout update changed PayPal `custom_id` from the legacy field positions. The existing PayPal webhook monitor still reads the second custom_id segment as the PlayCrows account/Player ID, so it interpreted the newly inserted `V1`/`V2` segment as the username.

The checkout metadata is now emitted as:

`PC|PLAYER_ID|V1|CHARACTER`

This preserves the field positions expected by the existing PayPal Discord monitor while still carrying the server. `submit-donation` and the PayPal recovery function accept both the old dual-server layout and the corrected layout so existing/in-flight payments remain valid.

## Deploy
Redeploy these Edge Functions:
- `paypal-checkout`
- `submit-donation`
- `recover-paypal-payment`

No SQL migration is required.

Redeploy the frontend for the Admin Dashboard table alignment update.
