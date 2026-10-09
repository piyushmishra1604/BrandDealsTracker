-- WP4.5: associates a creator with a campaign, without creating a deal yet (deal
-- assignment is M5). workspaceId is denormalized from the campaign so authorization
-- checks don't need an extra join — same pattern as every other workspace-scoped table.
begin;

create table public.campaign_creators (
  id uuid primary key default gen_random_uuid(),
  "campaignId" uuid not null references public.campaigns(id) on delete cascade,
  "creatorId" uuid not null references public.creators(id) on delete cascade,
  "workspaceId" uuid not null references public.workspaces(id) on delete cascade,
  "addedBy" uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique ("campaignId", "creatorId")
);

create index campaign_creators_campaign_id_idx on public.campaign_creators ("campaignId");
create index campaign_creators_creator_id_idx on public.campaign_creators ("creatorId");

alter table public.campaign_creators enable row level security;
revoke all on public.campaign_creators from anon, authenticated;

commit;
