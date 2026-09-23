-- Creates the outreach table for the Brand Outreach feature.
-- Mirrors the shared-access (no login) architecture already used by public.deals.
begin;

create table if not exists public.outreach (
  id text not null default gen_random_uuid()::text,
  "brandName" text not null check (char_length(btrim("brandName")) between 1 and 120),
  "contactPerson" text not null default '' check (char_length("contactPerson") <= 120),
  "contactRole" text not null default '' check (char_length("contactRole") <= 120),
  source text not null default 'Other' check (source in ('Instagram', 'Email', 'LinkedIn', 'Website Form', 'Other')),
  "dateReachedOut" date not null check ("dateReachedOut" between date '0001-01-01' and date '9999-12-31'),
  status text not null default 'New' check (status in ('New', 'In Conversation', 'Interested', 'Not Interested', 'Converted')),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

create index if not exists outreach_date_reached_out_idx on public.outreach ("dateReachedOut" desc);

-- Reuses the same generic trigger function already used by public.deals.
create trigger outreach_updated_at
before update on public.outreach
for each row execute function public.set_deal_updated_at();

alter table public.outreach enable row level security;

revoke all on public.outreach from anon, authenticated;
grant select, insert, update, delete on public.outreach to anon, authenticated;

create policy "Read shared outreach" on public.outreach
for select to anon, authenticated
using (true);

create policy "Insert shared outreach" on public.outreach
for insert to anon, authenticated
with check (true);

create policy "Update shared outreach" on public.outreach
for update to anon, authenticated
using (true) with check (true);

create policy "Delete shared outreach" on public.outreach
for delete to anon, authenticated
using (true);

commit;
