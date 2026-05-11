-- Refine overly-permissive tree insertion RLS policy.
-- Ensures users can only add themselves to trees where they are explicitly the record owner.
-- Legit invite claiming executes via the existing SECURITY DEFINER RPC, which bypasses RLS, so this doesn't block claims.

drop policy if exists "users can add themselves to trees" on tree_members;

create policy "users can add themselves to trees" on tree_members
  for insert with check (
    auth.uid() = user_id 
    and exists (
      select 1 from trees
      where id = tree_id and owner_id = auth.uid()
    )
  );
