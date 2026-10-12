-- Username: a unique, public handle for creators and managers so the app can identify
-- who to reach. Nullable, so existing accounts keep working until they pick one.
-- Stored lowercase; the format check and unique index back up the API validation.
begin;

alter table public.app_users add column if not exists username text;

alter table public.app_users
  add constraint app_users_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,30}$');

create unique index if not exists app_users_username_key on public.app_users (username);

commit;
