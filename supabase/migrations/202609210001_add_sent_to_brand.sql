-- Run in Supabase SQL Editor to add the "Sent to Brand" progress stage.
begin;

alter table public.deals
  add column if not exists "sentToBrand" boolean not null default false;

-- Existing deals already marked posted/paid predate this stage; backfill so the new constraints don't reject them.
update public.deals set "sentToBrand" = true where posted = true or "moneyReceived" = true;

alter table public.deals drop constraint if exists posted_requires_content;
alter table public.deals add constraint posted_requires_sent_to_brand
  check (not posted or "sentToBrand");
alter table public.deals add constraint sent_to_brand_requires_content
  check (not "sentToBrand" or "contentCreated");
alter table public.deals add constraint money_received_requires_posted
  check (not "moneyReceived" or posted);

commit;
