-- M4: creator directory. A "creator" row is an agency's contact — it may or may not
-- be linked to a real registered creator account yet (invitations/linking land later;
-- linkedUserId and status exist now so that future migration is additive, not a rewrite).
begin;

create table public.creators (
  id uuid primary key default gen_random_uuid(),
  "workspaceId" uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 16),
  "instagramHandle" text check ("instagramHandle" is null or char_length("instagramHandle") <= 50),
  category text check (category is null or char_length(category) <= 120),
  notes text check (notes is null or char_length(notes) <= 5000),
  status text not null default 'contact' check (status in ('contact', 'linked')),
  "linkedUserId" uuid references public.app_users(id) on delete set null,
  "createdBy" uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger creators_updated_at
before update on public.creators
for each row execute function public.set_deal_updated_at();

create index creators_workspace_id_idx on public.creators ("workspaceId");

-- Only backend code (service_role key) touches this table, matching every other table.
alter table public.creators enable row level security;
revoke all on public.creators from anon, authenticated;

commit;
