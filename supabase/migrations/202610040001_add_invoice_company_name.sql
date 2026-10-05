-- Brand and its invoicing company name can differ; adds a dedicated column for the Bill To company name.
begin;

alter table public.invoices
  add column if not exists "companyName" text not null default '' check (char_length(btrim("companyName")) between 0 and 120);

commit;
