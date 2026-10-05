-- Signup now requires verifying a one-time code emailed to the user before a session is issued.
begin;

alter table public.app_users add column if not exists email_verified_at timestamptz;

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_user_id_idx on public.email_verification_codes (user_id);

alter table public.email_verification_codes enable row level security;
revoke all on public.email_verification_codes from anon, authenticated;

commit;
