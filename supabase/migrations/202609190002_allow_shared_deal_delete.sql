-- Run in Supabase SQL Editor to enable the dashboard's Delete action.
-- Extends the chosen shared, no-login access model to deletion.
begin;

grant delete on public.deals to anon, authenticated;

drop policy if exists "Delete shared deals" on public.deals;
create policy "Delete shared deals"
on public.deals for delete
to anon, authenticated
using (true);

commit;
