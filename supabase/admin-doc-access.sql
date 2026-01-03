-- Allow Admins to View ALL Files in 'documents' bucket
-- Storage policies are defined on the storage.objects table

create policy "Admins can view all documents"
on storage.objects for select
using (
  bucket_id = 'documents'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Ensure the documents column exists on loans table (Fix for schema drift)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'loans' and column_name = 'documents') then
    alter table loans add column documents jsonb;
  end if;
end $$;
