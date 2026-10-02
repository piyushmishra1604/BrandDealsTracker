-- Creates a singleton profile table storing sender details and multiple selectable bank accounts.
-- Mirrors the shared-access (no login) architecture already used by public.deals.
begin;

create table if not exists public.profile (
  id text primary key default 'default',
  "senderName" text not null default '' check (char_length("senderName") <= 120),
  "senderEmail" text not null default '' check (char_length("senderEmail") <= 254),
  "senderAddress" text not null default '' check (char_length("senderAddress") <= 300),
  "bankAccounts" jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profile (id) values ('default')
on conflict (id) do nothing;

-- Reuses the same generic trigger function already used by public.deals.
create trigger profile_updated_at
before update on public.profile
for each row execute function public.set_deal_updated_at();

alter table public.profile enable row level security;

revoke all on public.profile from anon, authenticated;
grant select, update on public.profile to anon, authenticated;

create policy "Read shared profile" on public.profile
for select to anon, authenticated
using (true);

create policy "Update shared profile" on public.profile
for update to anon, authenticated
using (true) with check (true);

commit;
