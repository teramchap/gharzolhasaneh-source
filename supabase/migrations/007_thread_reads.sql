create table thread_reads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references users(id) on delete cascade,
  reader_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (member_id, reader_id)
);

alter table thread_reads enable row level security;

create policy "user manages own reads"
  on thread_reads for all
  using (reader_id = auth.uid())
  with check (reader_id = auth.uid());
