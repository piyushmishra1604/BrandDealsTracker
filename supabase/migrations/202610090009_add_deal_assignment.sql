-- M5: lets a manager assign a deal to a creator within a campaign. Deliberately extends the
-- existing creator-owned deals table (not a new "assigned deals" table) so the creator's
-- existing /api/deals GET (filtered by user_id = the signed-in creator) surfaces assigned
-- deals automatically, with zero changes needed on the creator side — one record, not two
-- copies of the same deal.
begin;

alter table public.deals
  add column "workspaceId" uuid references public.workspaces(id) on delete cascade,
  add column "campaignId" uuid references public.campaigns(id) on delete cascade,
  add column "assignedByUserId" uuid references public.app_users(id) on delete set null,
  add column "acceptanceStatus" text check ("acceptanceStatus" in ('pending', 'accepted', 'declined'));

-- A creator-authored deal (the original, unassigned flow) has none of these set; an
-- assigned deal always has all three identifying columns set together, so a half-assigned
-- row can never exist.
alter table public.deals add constraint assigned_deal_consistency check (
  ("campaignId" is null) = ("workspaceId" is null)
  and ("campaignId" is null) = ("assignedByUserId" is null)
  and ("campaignId" is null) = ("acceptanceStatus" is null)
);

-- One assigned deal per creator per campaign — re-assigning uses an upsert against this pair
-- instead of creating duplicate deals for the same campaign/creator combination.
create unique index deals_campaign_creator_unique_idx on public.deals ("campaignId", user_id) where "campaignId" is not null;
create index deals_workspace_id_idx on public.deals ("workspaceId");
create index deals_campaign_id_idx on public.deals ("campaignId");

commit;
