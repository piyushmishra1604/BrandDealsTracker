-- Run once in your Supabase project's SQL Editor.
-- Camel-case columns match the existing dashboard's deal fields.
begin;

create table public.deals (
  id text not null default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brand text not null check (char_length(btrim(brand)) between 1 and 120),
  amount numeric(14, 2) not null check (amount >= 0 and amount <> 'NaN'::numeric),
  "dealDate" date not null check ("dealDate" between date '0001-01-01' and date '9999-12-31'),
  "dueDate" date not null check ("dueDate" between date '0001-01-01' and date '9999-12-31'),
  "contentCreated" boolean not null default false,
  posted boolean not null default false,
  "moneyReceived" boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint content_due_after_deal check ("dueDate" >= "dealDate"),
  constraint posted_requires_content check (not posted or "contentCreated")
);

create index deals_user_due_date_idx on public.deals (user_id, "dueDate");
create index deals_user_deal_date_idx on public.deals (user_id, "dealDate" desc);

create function public.set_deal_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at = old.created_at;
  new.updated_at = now();
  return new;
end;
$$;

create trigger deals_updated_at
before update on public.deals
for each row execute function public.set_deal_updated_at();

alter table public.deals enable row level security;

revoke all on public.deals from anon, authenticated;
grant select, insert, update, delete on public.deals to authenticated;

create policy "Read own deals" on public.deals
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Insert own deals" on public.deals
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Update own deals" on public.deals
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Delete own deals" on public.deals
for delete to authenticated
using ((select auth.uid()) = user_id);

commit;
