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
6. Enter **Delivered To**, **Items Delivered**, and the exact **Backend Ledger Timestamp** shown by your backend.
7. Upload the original, unedited backend ledger screenshot. The upload button is clearly labeled **Upload Backend Ledger Screenshot**.
8. Add optional fulfillment notes if the raw ledger needs context.
9. Click **Mark Package as Delivered & Lock Evidence**.
10. If a dispute occurs, click **Generate Dispute Evidence Report**, then Print / Save as PDF. Attach the original payment receipt and backend delivery evidence separately.

Important: this creates a better evidence trail; it cannot guarantee the outcome of a PayPal or card chargeback.
