-- M1 WP1.2: agency workspaces. Only manager accounts ever belong to a workspace;
-- creators keep their existing user_id-scoped tables untouched.
begin;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_deal_updated_at();

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create trigger workspace_members_updated_at
before update on public.workspace_members
for each row execute function public.set_deal_updated_at();

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);

-- Defense in depth: even if application code has a bug, the database itself refuses
-- to let a creator account join a workspace. Managers and creators stay fully separate.
create function public.check_workspace_member_is_manager()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.app_users where id = new.user_id and account_type = 'manager'
  ) then
    raise exception 'Only manager accounts can belong to a workspace.';
  end if;
  return new;
end;
$$;

create trigger workspace_members_require_manager
before insert or update on public.workspace_members
for each row execute function public.check_workspace_member_is_manager();

-- Only backend code (service_role key) touches these tables, matching every other table in this app.
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_members from anon, authenticated;

commit;
