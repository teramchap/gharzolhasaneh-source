create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

create policy "admins can view all users"
  on users for select
  using (is_admin());
