-- Forgot/reset password feature removed: only login and signup remain.
begin;

drop table if exists public.password_reset_tokens;

commit;
