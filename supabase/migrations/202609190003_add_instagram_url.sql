-- Optional Instagram URL for a brand deal. Existing deals remain unchanged.
begin;

alter table public.deals
  add column if not exists "instagramUrl" text;

alter table public.deals
  drop constraint if exists deals_instagram_url_check;

alter table public.deals
  add constraint deals_instagram_url_check check (
    "instagramUrl" is null or (
      char_length("instagramUrl") <= 2048
      and "instagramUrl" ~ '^https://(www\.)?instagram\.com(/[^[:space:]]*)?$'
    )
  );

commit;
