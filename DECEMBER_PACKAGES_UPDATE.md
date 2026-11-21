# December packages and Garuda reward

## Shop changes

- December replaces September, October and November in the active shop. The five tiers are $50, $100, $200, $500 and $1,000, with all 184 supplied reward entries.
- The $200 Shining Accessory Enhancement Scroll Chest is **300**, exactly as supplied. The $50 Spell Starlight Crystal I is **2,300**. Named package rewards are included once per pack and scale with quantity.
- The supplied Garuda image and event terms appear in the catalog and checkout in all six supported languages.
- Existing historical package records remain available for payment recovery and administration. Retired monthly packs cannot start a new checkout or complete an unpaid PayPal order. Already completed payments remain recoverable.
- Existing version 19 PC/Android links, Discord invite, general cumulative rewards, Boosting limits, and research features are preserved.

## December reward

Garuda of Eternity Wings is an additional reward, **once per player**, after verified December purchases reach **$2,500**. All five tiers combine at their full listed USD price multiplied by quantity. Discounts do not reduce December progress; other categories do not contribute.

The database calculates eligibility from trusted package IDs and verified payments. The administration panel shows the reservation on its qualifying order. Save the payment review immediately before granting the reward to refresh its eligibility, then check the delivery items and attach the usual backend delivery evidence. The shop does not automatically deliver an in-game item: staff must grant the reward and record delivery.

Rejected or unverified purchases stop contributing, and an undelivered reservation can be revoked or transferred. Each order displays the snapshot from its latest review; save that review to refresh it after another order changes. Delivery validates the current reservation again. Delivered rewards remain consumed even if an order is later rejected or deleted, so subsequent purchases cannot earn another Garuda. Duplicate provider references cannot be credited again.

This event is separate from existing general cumulative rewards and the mount pre-order campaign. December packs are also recognized by the existing mount pre-order catalog; that campaign keeps its own launch and credit rules. No new calendar start/end date has been imposed on December packs.

## Deployment

The source update is local; it has not been published or applied to the live database.

Use the existing deployment process during a short checkout maintenance window:

1. Apply `supabase/migrations/20261121172350_december_packages_and_garuda_bonus.sql` after the repository's existing migrations.
2. Deploy the four updated functions from `supabase/edgefunction/`: `paypal-checkout`, `submit-donation`, `recover-paypal-payment`, and `update-donation-discord-status`.
3. Build and deploy the frontend through its existing hosting workflow, then reopen checkout.

The database update is required before the new admin interface is used. Deploying the frontend alone does not install reward tracking or retire old checkout requests. Keep existing environment variables and historical provider credentials; no new secrets are required.

## Validation

All 140 unit/handler checks and 83 isolated PostgreSQL checks pass. They cover every reward quantity, active and archived catalogs, translated event terms, payment handling, administration, and database behavior. All four browser scenarios pass with mocked requests: desktop catalog, mobile catalog, checkout/submission, and all six languages. These include all five reward lists and checkout quantities. No live payment, reward, database mutation or Discord notification was sent during testing.

The production build and TypeScript checks pass. The obsolete unused October notice component has been removed, resolving its previous translation-key errors. Source backups and browser screenshots are retained in the task workspace; dependencies and local preview builds are not copied into the project.
