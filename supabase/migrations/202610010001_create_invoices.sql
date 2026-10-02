-- Creates the invoices table for the Invoices feature.
-- Mirrors the shared-access (no login) architecture already used by public.deals.
begin;

create table if not exists public.invoices (
  id text not null default gen_random_uuid()::text,
  "invoiceNumber" text not null check (char_length(btrim("invoiceNumber")) between 1 and 40),
  brand text not null check (char_length(btrim(brand)) between 1 and 120),
  "issueDate" date not null check ("issueDate" between date '0001-01-01' and date '9999-12-31'),
  "dueDate" date not null check ("dueDate" between date '0001-01-01' and date '9999-12-31'),
  currency text not null default 'INR' check (currency in ('INR', 'USD', 'EUR', 'GBP')),
  "senderName" text not null check (char_length(btrim("senderName")) between 1 and 120),
  "senderEmail" text not null default '' check (char_length("senderEmail") <= 254),
  "senderAddress" text not null default '' check (char_length("senderAddress") <= 300),
  items jsonb not null default '[]'::jsonb,
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique ("invoiceNumber")
);

create index if not exists invoices_issue_date_idx on public.invoices ("issueDate" desc);

-- Reuses the same generic trigger function already used by public.deals.
create trigger invoices_updated_at
before update on public.invoices
for each row execute function public.set_deal_updated_at();

alter table public.invoices enable row level security;

revoke all on public.invoices from anon, authenticated;
grant select, insert, update, delete on public.invoices to anon, authenticated;

create policy "Read shared invoices" on public.invoices
for select to anon, authenticated
using (true);

create policy "Insert shared invoices" on public.invoices
for insert to anon, authenticated
with check (true);

create policy "Update shared invoices" on public.invoices
for update to anon, authenticated
using (true) with check (true);

create policy "Delete shared invoices" on public.invoices
for delete to anon, authenticated
using (true);

commit;
