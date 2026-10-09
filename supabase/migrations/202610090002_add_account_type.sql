-- M1 WP1.3: account type separates creators from managers. Immutable after signup;
-- every existing app_users row is a creator (no one has signed up as a manager yet).
begin;

alter table public.app_users
  add column if not exists account_type text not null default 'creator'
  check (account_type in ('creator', 'manager'));

commit;
