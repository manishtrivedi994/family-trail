-- 1. Fix Invites RLS: Allow users to claim an invite that hasn't been claimed yet
drop policy if exists "users can claim invites" on invites;
create policy "users can claim invites" on invites
  for update using (
    claimed_by is null and 
    (expires_at is null or expires_at > now())
  )
  with check (
    claimed_by = auth.uid() and
    claimed_at is not null
  );

-- 2. Fix Members RLS: Allow users to link themselves to a member node if they are in tree_members
drop policy if exists "users can link self to member" on members;
create policy "users can link self to member" on members
  for update using (
    is_tree_member(tree_id) and 
    (user_id is null or user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
  );

-- Note: Ensure users can also update their own member profile information going forward
drop policy if exists "members can update their own profiles" on members;
create policy "members can update their own profiles" on members
  for update using (
    auth.uid() = user_id
  );
