-- Custom auth: app-owned users table + password reset tokens, replacing Supabase Auth's auth.users.
begin;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger app_users_updated_at
before update on public.app_users
for each row execute function public.set_deal_updated_at();

-- No RLS: this table is only ever touched by backend code using the service_role key.
alter table public.app_users enable row level security;
revoke all on public.app_users from anon, authenticated;

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx on public.password_reset_tokens (user_id);

alter table public.password_reset_tokens enable row level security;
revoke all on public.password_reset_tokens from anon, authenticated;

commit;
