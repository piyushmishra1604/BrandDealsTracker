-- Adds optional bank/payment detail columns to public.invoices so invoices can show how to pay.
begin;

alter table public.invoices
  add column if not exists "bankName" text not null default '' check (char_length("bankName") <= 120),
  add column if not exists "accountHolder" text not null default '' check (char_length("accountHolder") <= 120),
  add column if not exists "accountNumber" text not null default '' check (char_length("accountNumber") <= 120),
  add column if not exists "ifscOrSwift" text not null default '' check (char_length("ifscOrSwift") <= 120),
  add column if not exists "upiId" text not null default '' check (char_length("upiId") <= 120);

commit;
