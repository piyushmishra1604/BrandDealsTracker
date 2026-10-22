begin;

-- An account can now hold both a creator and a manager profile under one login, so
-- account_type becomes an array of every role the account has instead of exactly one.
alter table public.app_users add column account_types text[];
update public.app_users set account_types = array[account_type];
alter table public.app_users alter column account_types set not null;
alter table public.app_users add constraint app_users_account_types_check
  check (
    cardinality(account_types) > 0
    and account_types <@ array['creator'::text, 'manager'::text]
  );
create index app_users_account_types_idx on public.app_users using gin (account_types);

-- Workspace membership still requires a manager role, now checked against the array.
create or replace function public.check_workspace_member_is_manager()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.app_users where id = new.user_id and account_types @> array['manager'::text]
  ) then
    raise exception 'Only manager accounts can belong to a workspace.';
  end if;
  return new;
end;
$$;

alter table public.app_users drop constraint "app_users_account_type_check";
alter table public.app_users drop column account_type;

commit;
