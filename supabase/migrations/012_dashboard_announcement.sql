-- A single editable banner shown under the cards on the member home page.
create table dashboard_announcement (
  id text primary key default 'main',
  image_path text,
  message text,
  updated_at timestamptz not null default now()
);

insert into dashboard_announcement (id) values ('main');

alter table dashboard_announcement enable row level security;

create policy "everyone can view the announcement"
  on dashboard_announcement for select
  using (true);

create policy "admin can manage the announcement"
  on dashboard_announcement for update
  using (is_admin())
  with check (is_admin());
