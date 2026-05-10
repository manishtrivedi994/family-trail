-- 1. Fix Tree Members RLS: Allow self-upserts (Insert + Update)
-- This ensures the client succeeds even if running older code that uses .upsert()
drop policy if exists "users can add themselves to trees" on tree_members;
create policy "users can join trees" on tree_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "users can update their tree memberships" on tree_members;
create policy "users can update their tree memberships" on tree_members
  for update using (auth.uid() = user_id);

-- 2. Fix Invites RLS: Allow users to claim an invite that hasn't been claimed yet
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

-- 3. Fix Members RLS: Allow users to link themselves to a member node
drop policy if exists "users can link self to member" on members;
create policy "users can link self to member" on members
  for update using (
    is_tree_member(tree_id) and 
    (user_id is null or user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
  );

-- Note: Ensure users can update their own member profile information
drop policy if exists "members can update their own profiles" on members;
create policy "members can update their own profiles" on members
  for update using (
    auth.uid() = user_id
  );
