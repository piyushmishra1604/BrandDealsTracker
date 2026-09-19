# Supabase setup — no login

The app uses one shared set of deals with no authentication. Anyone with the project URL and publishable key can read, add, and edit these records, even if the web app is only run locally. This is the intentionally selected access model. Deletion is enabled by the separate delete migration below.

1. Keep NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.
2. In Supabase SQL Editor, run `supabase/migrations/202609180002_shared_deals.sql`. This file works for a fresh project or one where the earlier user-owned table was created. Existing rows are retained. Do not run the older migration manually afterward.
3. Start `npm run dev -- --webpack` and open http://localhost:3000. Google provider setup is not needed.
4. Use Add Brand Deal, or Import browser deals to copy the earlier localStorage records. Import skips existing IDs and leaves the browser copy unchanged.
5. Edit a deal and refresh to verify persistence. Saving requires a successful Supabase response.

The publishable key cannot create tables or apply migrations. Run the SQL in the dashboard. If switching from multiple user accounts with colliding deal IDs, the migration stops without changing data; resolve those IDs first.

## Enable deletion

Run `supabase/migrations/202609190002_allow_shared_deal_delete.sql` in SQL Editor after the shared-deals migration. The three-dot row menu includes Edit and Delete. Delete asks for confirmation and only removes the row from the dashboard after the database confirms deletion. Cancelling leaves the deal unchanged. Deletion uses the same shared, no-login access model.

If you rerun the earlier shared-deals migration, reapply the delete migration afterward because the earlier migration resets table grants.

## Instagram links

Run `supabase/migrations/202609190003_add_instagram_url.sql` in SQL Editor before saving Instagram links. Add or edit a deal and enter its optional HTTPS Instagram URL. Brand names with links open Instagram in a new tab. Empty fields are stored as NULL; existing records do not need links.

## Deliverables and notes

Run `supabase/migrations/202609190004_add_deliverables.sql` before saving the new form. Existing deals get empty deliverables and notes. Add/Edit supports up to 50 items, each with a type and quantity (1–999), and notes up to 5,000 characters. Clicking a row or its chevron expands the details; Instagram and action-menu clicks are independent. Check saving, refreshing, clearing all deliverables, and cancelling edits after applying the migration.

## Dashboard detail styling and contacts

Run `supabase/migrations/202609190005_add_brand_contact.sql` after the deliverables migration. Category, contact name, email, and WhatsApp number are optional and editable in Add/Edit. Use international phone format such as +491234567890. The WhatsApp button opens the contact without sending a message; Copy contact copies the stored details. The dashboard does not display brand avatars.
