insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "authenticated users can upload receipt images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');

create policy "anyone can view receipt images"
  on storage.objects for select
  using (bucket_id = 'receipts');
