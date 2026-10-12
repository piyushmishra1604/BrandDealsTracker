begin;

-- Delivery stages on a deal are content created → sent to brand → posted → settled (money received).
-- The posted date records when the content went live. It's only meaningful once the deal is posted.
alter table public.deals add column if not exists "postedDate" date;
alter table public.deals add constraint posted_date_requires_posted
  check ("postedDate" is null or posted);

commit;
