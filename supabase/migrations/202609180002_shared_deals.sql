-- Run this whole file in the SQL Editor. Works with a fresh database or the previous user-owned table.
-- Intentionally allows read/insert/update using the public publishable key, without login.
-- Does not grant anonymous delete access.
begin;

create table if not exists public.deals (
  id text not null default gen_random_uuid()::text,
  brand text not null check (char_length(btrim(brand)) between 1 and 120),
  amount numeric(14, 2) not null check (amount >= 0 and amount <> 'NaN'::numeric),
  "dealDate" date not null check ("dealDate" between date '0001-01-01' and date '9999-12-31'),
  "dueDate" date not null check ("dueDate" between date '0001-01-01' and date '9999-12-31'),
  "contentCreated" boolean not null default false,
  posted boolean not null default false,
  "moneyReceived" boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  constraint content_due_after_deal check ("dueDate" >= "dealDate"),
  constraint posted_requires_content check (not posted or "contentCreated")
);

-- Preserve existing rows while removing the login requirement from the old schema.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'deals' and column_name = 'user_id') then
    if exists (select id from public.deals group by id having count(*) > 1) then
      raise exception 'Duplicate deal IDs exist across users. Resolve these before switching to shared access; no data has been changed.';
    end if;
    alter table public.deals drop constraint if exists deals_user_id_fkey;
    alter table public.deals alter column user_id drop not null;
    alter table public.deals alter column user_id drop default;
    alter table public.deals drop constraint deals_pkey;
    alter table public.deals add primary key (id);
  end if;
end;
$$;

create index if not exists deals_due_date_idx on public.deals ("dueDate");
create or replace function public.set_deal_updated_at()
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

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at
before update on public.deals
for each row execute function public.set_deal_updated_at();

alter table public.deals enable row level security;
revoke all on public.deals from anon, authenticated;
grant select, insert, update on public.deals to anon, authenticated;

drop policy if exists "Read own deals" on public.deals;
drop policy if exists "Insert own deals" on public.deals;
drop policy if exists "Update own deals" on public.deals;
drop policy if exists "Delete own deals" on public.deals;
drop policy if exists "Read shared deals" on public.deals;
drop policy if exists "Insert shared deals" on public.deals;
drop policy if exists "Update shared deals" on public.deals;

create policy "Read shared deals" on public.deals for select to anon, authenticated using (true);
create policy "Insert shared deals" on public.deals for insert to anon, authenticated with check (true);
create policy "Update shared deals" on public.deals for update to anon, authenticated using (true) with check (true);
commit;
