-- Optional metadata for expanded Dashboard details. Run after the deliverables migration.
begin;

alter table public.deals
  add column if not exists category text not null default '',
  add column if not exists "contactName" text not null default '',
  add column if not exists "contactEmail" text not null default '',
  add column if not exists "contactPhone" text not null default '';

alter table public.deals drop constraint if exists deals_contact_details_check;
alter table public.deals add constraint deals_contact_details_check check (
  char_length(category) <= 120
  and char_length("contactName") <= 120
  and char_length("contactEmail") <= 254
  and ("contactPhone" = '' or "contactPhone" ~ '^\+[1-9][0-9]{6,14}$')
);

commit;
