-- Apply in Supabase SQL Editor. Existing dates are not silently rewritten.
-- New deals and edits must use today or earlier for dealDate.
-- Future content due dates remain allowed.
begin;

create or replace function public.validate_deal_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new."dealDate" > (statement_timestamp() at time zone 'Europe/Berlin')::date then
    raise exception 'Deal date cannot be in the future. Choose today or an earlier date.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists deals_validate_date on public.deals;
create trigger deals_validate_date
before insert or update on public.deals
for each row execute function public.validate_deal_date();

commit;

-- Review existing records that need their actual deal date entered.
select id, brand, "dealDate", "dueDate"
from public.deals
where "dealDate" > (statement_timestamp() at time zone 'Europe/Berlin')::date;
