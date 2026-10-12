begin;

-- Archiving hides a campaign without changing its status, so it no longer uses a status value.
alter table public.campaigns add column if not exists archived boolean not null default false;

commit;
