-- Custom auth replaces Supabase Auth: user_id now references our own app_users table.
-- All existing rows already have user_id = NULL (no one had signed in yet), so this is a safe repoint.
begin;

alter table public.deals drop constraint if exists deals_user_id_fkey;
alter table public.deals alter column user_id drop default;
alter table public.deals add constraint deals_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;

alter table public.outreach drop constraint if exists outreach_user_id_fkey;
alter table public.outreach alter column user_id drop default;
alter table public.outreach add constraint outreach_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;

alter table public.invoices drop constraint if exists invoices_user_id_fkey;
alter table public.invoices alter column user_id drop default;
alter table public.invoices add constraint invoices_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;

alter table public.profile drop constraint if exists profile_user_id_fkey;
alter table public.profile alter column user_id drop default;
alter table public.profile add constraint profile_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;

-- Only backend code (service_role key) touches these tables now; no direct browser access via Supabase Auth JWTs.
revoke all on public.deals from anon, authenticated;
revoke all on public.outreach from anon, authenticated;
revoke all on public.invoices from anon, authenticated;
revoke all on public.profile from anon, authenticated;

commit;
