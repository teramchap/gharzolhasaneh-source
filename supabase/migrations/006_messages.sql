create table messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references users(id) on delete cascade, -- which member's thread
  sender_id uuid not null references users(id), -- who actually sent it (member or admin)
  body text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "member or admin can view thread"
  on messages for select
  using (member_id = auth.uid() or is_admin());

create policy "member or admin can send in thread"
  on messages for insert
  with check ((member_id = auth.uid() and sender_id = auth.uid()) or is_admin());

alter publication supabase_realtime add table public.messages;
