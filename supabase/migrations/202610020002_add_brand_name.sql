-- Adds a brand name field to the profile and invoices so a creator's own brand can be shown at the top of invoices.
begin;

alter table public.profile
  add column if not exists "brandName" text not null default '' check (char_length("brandName") <= 120);

alter table public.invoices
  add column if not exists "senderBrandName" text not null default '' check (char_length("senderBrandName") <= 120);

commit;
