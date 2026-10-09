-- M2+M3: agency campaigns. Scoped to a workspace; only managers in that workspace
-- can see/edit a campaign (enforced in application code via requireWorkspaceAccess,
-- same pattern as every other table — these are written only by the service role key).
-- Column names are quoted camelCase, matching the Campaign type in lib/campaigns.ts
-- directly (the same convention already used by public.deals and public.invoices).
begin;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  "workspaceId" uuid not null references public.workspaces(id) on delete cascade,
  brand text not null check (char_length(btrim(brand)) between 1 and 120),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  budget numeric(14, 2) not null check (budget >= 0 and budget <> 'NaN'::numeric),
  currency text not null check (currency in ('INR', 'USD', 'EUR', 'GBP')),
  "startDate" date not null,
  "endDate" date not null check ("endDate" >= "startDate"),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  "createdBy" uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_deal_updated_at();

create index campaigns_workspace_id_idx on public.campaigns ("workspaceId");
create index campaigns_status_idx on public.campaigns (status);

-- Only backend code (service_role key) touches this table, matching every other table.
alter table public.campaigns enable row level security;
revoke all on public.campaigns from anon, authenticated;

commit;
