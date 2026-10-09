-- Public storage bucket for campaign thumbnail/brand images. Writes only ever happen
-- server-side via the service-role key (same as invoice-pdfs' upload route), so no
-- RLS policies are needed — the service role bypasses RLS, and the "public" bucket
-- flag alone is what makes getPublicUrl() readable from the browser.
begin;

alter table public.campaigns
  add column if not exists "imageUrl" text check ("imageUrl" is null or char_length("imageUrl") <= 2048);

insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

commit;
