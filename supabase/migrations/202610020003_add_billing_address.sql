-- Adds a free-form billing address field to deals (for GSTIN/registered company address, pasted once per brand)
-- and a matching snapshot field on invoices (so saved invoices keep their own copy).
begin;

alter table public.deals
  add column if not exists "billingAddress" text not null default '' check (char_length("billingAddress") <= 1000);

alter table public.invoices
  add column if not exists "billToAddress" text not null default '' check (char_length("billToAddress") <= 1000);

commit;
