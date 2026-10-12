begin;

-- WP4.8: a manager issues a single-use invite link for an unlinked creator contact.
-- Only a SHA-256 hash of the token is stored, so the raw link can't be recovered from the database.
create table public.creator_invitations (
  id uuid primary key default gen_random_uuid(),
  "workspaceId" uuid not null references public.workspaces(id) on delete cascade,
  "creatorId" uuid not null references public.creators(id) on delete cascade,
  email text not null,
  "tokenHash" text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  "expiresAt" timestamptz not null,
  "acceptedAt" timestamptz,
  "acceptedByUserId" uuid references public.app_users(id) on delete set null,
  "createdByUserId" uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint accepted_invitation_has_account check ((status = 'accepted') = ("acceptedAt" is not null and "acceptedByUserId" is not null))
);

-- At most one live invitation per creator; re-issuing revokes the previous one first.
create unique index creator_invitations_one_pending_idx on public.creator_invitations ("creatorId") where status = 'pending';
create index creator_invitations_workspace_idx on public.creator_invitations ("workspaceId", "creatorId");

alter table public.creator_invitations enable row level security;
revoke all on public.creator_invitations from anon, authenticated;

commit;
