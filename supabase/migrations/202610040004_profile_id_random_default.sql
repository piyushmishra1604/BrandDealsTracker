-- Each authenticated user now gets their own profile row; ids must no longer collide on the literal 'default'.
begin;
alter table public.profile alter column id set default gen_random_uuid()::text;
commit;
