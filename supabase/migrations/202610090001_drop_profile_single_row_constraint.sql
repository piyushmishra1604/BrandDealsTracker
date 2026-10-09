-- The single-row check (id = 'default') was never dropped when profile became per-user,
-- blocking profile creation for every user besides the original one. Replace it with a
-- per-user uniqueness constraint instead.
begin;
alter table public.profile drop constraint profile_single_row;
alter table public.profile add constraint profile_user_id_unique unique (user_id);
commit;
