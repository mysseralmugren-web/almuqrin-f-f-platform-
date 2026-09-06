-- File Center keeps the normal 50 MB client limit, while catalog PDFs may use resumable uploads up to 200 MiB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mfg-attachments', 'mfg-attachments', false, 209715200, null)
on conflict (id) do update
set public = false,
    file_size_limit = 209715200,
    allowed_mime_types = null;

drop policy if exists "file_center_storage_read" on storage.objects;
create policy "file_center_storage_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'mfg-attachments'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists "file_center_storage_insert" on storage.objects;
create policy "file_center_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mfg-attachments'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and coalesce((storage.foldername(name))[2], '') <> 'hr'
);
