-- Invoice PDFs stay publicly readable (so brands can open a shared link without logging in),
-- but uploads/edits/deletes are now restricted to the authenticated owner's folder ({user_id}/{invoiceId}.pdf).
begin;

drop policy if exists "Upload invoice pdfs" on storage.objects;
drop policy if exists "Update invoice pdfs" on storage.objects;
drop policy if exists "Delete invoice pdfs" on storage.objects;

create policy "Upload own invoice pdfs" on storage.objects
for insert to authenticated
with check (bucket_id = 'invoice-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Update own invoice pdfs" on storage.objects
for update to authenticated
using (bucket_id = 'invoice-pdfs' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'invoice-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Delete own invoice pdfs" on storage.objects
for delete to authenticated
using (bucket_id = 'invoice-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

commit;
