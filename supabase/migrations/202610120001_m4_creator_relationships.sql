-- M4 Slice 1: creator relationship (external or managed), archive state, deals that point at
-- a creator profile (so unlinked creators can have manual deals), and notifications.
-- deals."user_id" stays the creator's visibility key: linked deals keep it, manual deals leave it null.
begin;

alter table public.creators
  add column relationship text not null default 'external' check (relationship in ('external', 'managed')),
  add column "archivedAt" timestamptz,
  add constraint managed_creator_is_linked check (relationship = 'external' or "linkedUserId" is not null);

alter table public.deals add column "creatorId" uuid references public.creators(id) on delete restrict;

-- Backfill: every existing assigned deal belongs to the campaign creator whose linked account owns it.
update public.deals d
set "creatorId" = c.id
from public.creators c
join public.campaign_creators cc on cc."creatorId" = c.id
where d."campaignId" is not null
  and cc."campaignId" = d."campaignId"
  and c."linkedUserId" = d.user_id;

alter table public.deals drop constraint assigned_deal_consistency;
alter table public.deals add constraint assigned_deal_consistency check (
  ("campaignId" is null) = ("workspaceId" is null)
  and ("campaignId" is null) = ("assignedByUserId" is null)
  and ("campaignId" is null) = ("acceptanceStatus" is null)
  and ("campaignId" is null) = ("creatorId" is null)
  -- A manual deal (creator has no account) has no user_id; a linked assigned deal always has one.
  and ("campaignId" is null or (("acceptanceStatus" = 'manual') = ("user_id" is null)))
);

-- Creator-authored deals (no campaign) must still be owned by a user.
alter table public.deals add constraint deal_has_owner check ("user_id" is not null or "campaignId" is not null);

alter table public.deals drop constraint "deals_acceptanceStatus_check";
alter table public.deals add constraint "deals_acceptanceStatus_check"
  check ("acceptanceStatus" = any (array['pending'::text, 'countered'::text, 'accepted'::text, 'confirmed'::text, 'declined'::text, 'manual'::text]));

-- Uniqueness moves from the account to the creator profile, because manual deals have no account.
drop index public.deals_campaign_creator_unique_idx;
create unique index deals_campaign_creator_unique_idx on public.deals ("campaignId", "creatorId") where "campaignId" is not null;
create index deals_creator_id_idx on public.deals ("creatorId");
create index creators_workspace_relationship_idx on public.creators ("workspaceId", relationship);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.app_users(id) on delete cascade,
  "workspaceId" uuid references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('deal_assigned')),
  "dealId" text references public.deals(id) on delete cascade,
  "readAt" timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications ("userId", "readAt");

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

commit;

-- Rollback (run manually if this migration must be reverted):
--   drop table public.notifications;
--   drop index public.creators_workspace_relationship_idx;
--   drop index public.deals_creator_id_idx;
--   drop index public.deals_campaign_creator_unique_idx;
--   create unique index deals_campaign_creator_unique_idx on public.deals ("campaignId", user_id) where "campaignId" is not null;
--   alter table public.deals drop constraint "deals_acceptanceStatus_check";
--   alter table public.deals add constraint "deals_acceptanceStatus_check" check ("acceptanceStatus" = any (array['pending'::text, 'countered'::text, 'accepted'::text, 'confirmed'::text, 'declined'::text]));
--   alter table public.deals drop constraint deal_has_owner;
--   alter table public.deals drop constraint assigned_deal_consistency;
--   alter table public.deals add constraint assigned_deal_consistency check (("campaignId" is null) = ("workspaceId" is null) and ("campaignId" is null) = ("assignedByUserId" is null) and ("campaignId" is null) = ("acceptanceStatus" is null));
--   alter table public.deals drop column "creatorId";
--   alter table public.creators drop constraint managed_creator_is_linked, drop column "archivedAt", drop column relationship;
