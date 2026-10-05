-- Email verification is removed: signup/login now work with email + password only.
begin;

drop table if exists public.email_verification_codes;
alter table public.app_users drop column if exists email_verified_at;

commit;
