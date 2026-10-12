-- M6: creator acceptance and price negotiation on assigned deals.

alter table public.deals drop constraint "deals_acceptanceStatus_check";
alter table public.deals add constraint "deals_acceptanceStatus_check"
  check ("acceptanceStatus" = any (array['pending'::text, 'countered'::text, 'accepted'::text, 'confirmed'::text, 'declined'::text]));

create table if not exists public.deal_offers (
  id uuid primary key default gen_random_uuid(),
  "dealId" text not null references public.deals(id) on delete cascade,
  actor text not null check (actor in ('manager', 'creator')),
  event text not null check (event in ('offer', 'counter', 'accept', 'confirm', 'decline')),
  amount numeric not null check (amount >= 0 and amount <> 'NaN'::numeric),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists deal_offers_deal_created_idx on public.deal_offers ("dealId", created_at);

alter table public.deal_offers enable row level security;
revoke all on public.deal_offers from anon, authenticated;

-- Compare-and-set update plus history row in one transaction. Rejects the write when the
-- status is no longer what the caller last read, so two people can't act on the same offer.
create or replace function public.apply_deal_change(
  p_deal_id text,
  p_expected_status text,
  p_patch jsonb,
  p_actor text default null,
  p_event text default null,
  p_note text default null
)
returns public.deals
language plpgsql
set search_path = public
as $$
declare
  cur public.deals;
  nxt public.deals;
  result public.deals;
begin
  select * into cur from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;
  if cur."acceptanceStatus" is distinct from p_expected_status then
    raise exception 'status_changed' using errcode = 'P0001';
  end if;

  nxt := jsonb_populate_record(cur, p_patch);

  update public.deals set
    brand = nxt.brand,
    amount = nxt.amount,
    "dealDate" = nxt."dealDate",
    "dueDate" = nxt."dueDate",
    "contentCreated" = nxt."contentCreated",
    "sentToBrand" = nxt."sentToBrand",
    posted = nxt.posted,
    "moneyReceived" = nxt."moneyReceived",
    "instagramUrl" = nxt."instagramUrl",
    deliverables = nxt.deliverables,
    notes = nxt.notes,
    category = nxt.category,
    "contactName" = nxt."contactName",
    "contactEmail" = nxt."contactEmail",
    "contactPhone" = nxt."contactPhone",
    "billingAddress" = nxt."billingAddress",
    "acceptanceStatus" = nxt."acceptanceStatus",
    updated_at = now()
  where id = p_deal_id
  returning * into result;

  if p_event is not null then
    insert into public.deal_offers ("dealId", actor, event, amount, note)
    values (p_deal_id, p_actor, p_event, result.amount, coalesce(p_note, ''));
  end if;

  return result;
end;
$$;

revoke all on function public.apply_deal_change(text, text, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_deal_change(text, text, jsonb, text, text, text) to service_role;
