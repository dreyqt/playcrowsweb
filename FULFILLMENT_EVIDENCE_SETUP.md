# PlayCrows Fulfillment Evidence Setup

1. Open Supabase -> SQL Editor.
2. Run `supabase/migrations/20260812_add_fulfillment_evidence.sql` once.
3. Confirm the existing private `payment-receipts` Storage bucket permits authenticated admins to upload/read files. Fulfillment screenshots are stored under `fulfillment/<REFERENCE>/...` in that bucket.
4. Redeploy the website to Vercel.

## Admin workflow

1. Open a submission with **Review**.
2. Verify the payment directly in PayPal/payment provider; do not rely only on the player's screenshot.
3. For PayPal, enter the PayPal Transaction ID.
4. Check **Payment independently verified**.
5. Deliver the package through the game backend.
6. Capture the backend's successful delivery screen and upload it.
7. Add useful fulfillment notes (items delivered, character, backend confirmation, etc.).
8. Click **Mark Package as Delivered & Lock Evidence**.
9. If a dispute occurs, click **Generate Dispute Evidence Report**, then Print / Save as PDF. Attach the original payment receipt and backend delivery evidence separately.

Important: this creates a better evidence trail; it cannot guarantee the outcome of a PayPal or card chargeback.
