-- Run in Supabase SQL Editor before saving deliverables or notes.
begin;

alter table public.deals
  add column if not exists deliverables jsonb not null default '[]'::jsonb,
  add column if not exists notes text not null default '';

create or replace function public.valid_deal_deliverables(items jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  quantity numeric;
begin
  if items is null or jsonb_typeof(items) <> 'array' then return false; end if;
  if jsonb_array_length(items) > 50 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object'
      or not (item ? 'type' and item ? 'quantity')
      or jsonb_typeof(item->'type') <> 'string'
      or item->>'type' not in ('Reel', 'Story', 'Post', 'Other')
      or jsonb_typeof(item->'quantity') <> 'number' then
      return false;
    end if;
    quantity := (item->>'quantity')::numeric;
    if quantity < 1 or quantity > 999 or quantity <> trunc(quantity) then return false; end if;
  end loop;
  return true;
end;
$$;

alter table public.deals drop constraint if exists deals_deliverables_check;
alter table public.deals add constraint deals_deliverables_check
  check (public.valid_deal_deliverables(deliverables));
alter table public.deals drop constraint if exists deals_notes_length_check;
alter table public.deals add constraint deals_notes_length_check
  check (char_length(notes) <= 5000);

commit;
