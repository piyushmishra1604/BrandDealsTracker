-- Introduces per-user authentication. Existing rows get user_id = NULL (invisible under new RLS)
-- until backfilled to the real owner's auth.users id once they sign in for the first time.
begin;

alter table public.deals add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.outreach add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.invoices add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.profile add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

create index if not exists deals_user_id_idx on public.deals (user_id);
create index if not exists outreach_user_id_idx on public.outreach (user_id);
create index if not exists invoices_user_id_idx on public.invoices (user_id);
create unique index if not exists profile_user_id_key on public.profile (user_id);

-- deals
revoke all on public.deals from anon, authenticated;
grant select, insert, update, delete on public.deals to authenticated;
drop policy if exists "Read shared deals" on public.deals;
drop policy if exists "Insert shared deals" on public.deals;
drop policy if exists "Update shared deals" on public.deals;
drop policy if exists "Delete shared deals" on public.deals;
create policy "Read own deals" on public.deals for select to authenticated using (auth.uid() = user_id);
create policy "Insert own deals" on public.deals for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own deals" on public.deals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own deals" on public.deals for delete to authenticated using (auth.uid() = user_id);

-- outreach
revoke all on public.outreach from anon, authenticated;
grant select, insert, update, delete on public.outreach to authenticated;
drop policy if exists "Read shared outreach" on public.outreach;
drop policy if exists "Insert shared outreach" on public.outreach;
drop policy if exists "Update shared outreach" on public.outreach;
drop policy if exists "Delete shared outreach" on public.outreach;
create policy "Read own outreach" on public.outreach for select to authenticated using (auth.uid() = user_id);
create policy "Insert own outreach" on public.outreach for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own outreach" on public.outreach for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own outreach" on public.outreach for delete to authenticated using (auth.uid() = user_id);

-- invoices
revoke all on public.invoices from anon, authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
drop policy if exists "Read shared invoices" on public.invoices;
drop policy if exists "Insert shared invoices" on public.invoices;
drop policy if exists "Update shared invoices" on public.invoices;
drop policy if exists "Delete shared invoices" on public.invoices;
create policy "Read own invoices" on public.invoices for select to authenticated using (auth.uid() = user_id);
create policy "Insert own invoices" on public.invoices for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own invoices" on public.invoices for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own invoices" on public.invoices for delete to authenticated using (auth.uid() = user_id);

-- profile
revoke all on public.profile from anon, authenticated;
grant select, insert, update on public.profile to authenticated;
drop policy if exists "Read shared profile" on public.profile;
drop policy if exists "Update shared profile" on public.profile;
create policy "Read own profile" on public.profile for select to authenticated using (auth.uid() = user_id);
create policy "Insert own profile" on public.profile for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own profile" on public.profile for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
