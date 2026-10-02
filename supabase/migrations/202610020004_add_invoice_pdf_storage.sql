-- Creates a public storage bucket for generated invoice PDFs, and adds a pdfUrl column to track them.
begin;

alter table public.invoices
  add column if not exists "pdfUrl" text not null default '' check (char_length("pdfUrl") <= 2048);

insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', true)
on conflict (id) do nothing;

-- Shared-access app (no login): allow anon/authenticated to read, upload, and overwrite invoice PDFs.
create policy "Read invoice pdfs" on storage.objects
for select to anon, authenticated
using (bucket_id = 'invoice-pdfs');

create policy "Upload invoice pdfs" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'invoice-pdfs');

create policy "Update invoice pdfs" on storage.objects
for update to anon, authenticated
using (bucket_id = 'invoice-pdfs') with check (bucket_id = 'invoice-pdfs');

create policy "Delete invoice pdfs" on storage.objects
for delete to anon, authenticated
using (bucket_id = 'invoice-pdfs');

commit;
