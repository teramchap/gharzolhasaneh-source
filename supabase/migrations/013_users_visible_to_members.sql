-- Members need to see each other's names for the goodwill ranking
-- (and similar member-facing lists) to work — not just their own row.
create policy "authenticated members can view all profiles"
  on users for select
  to authenticated
  using (true);
