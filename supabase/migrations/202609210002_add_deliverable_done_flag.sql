-- Run in Supabase SQL Editor to allow an optional "done" flag on each deliverable.
begin;

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
      or item->>'type' not in ('Reel', 'Story', 'Post', 'Ad Rights', 'Other')
      or jsonb_typeof(item->'quantity') <> 'number'
      or (item ? 'done' and jsonb_typeof(item->'done') <> 'boolean') then
      return false;
    end if;
    quantity := (item->>'quantity')::numeric;
    if quantity < 1 or quantity > 999 or quantity <> trunc(quantity) then return false; end if;
  end loop;
  return true;
end;
$$;

commit;
