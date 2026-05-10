-- 1. Allow non-owners to remove their own record from tree_members (Leave Tree)
drop policy if exists "users can leave trees" on tree_members;
create policy "users can leave trees" on tree_members
  for delete using (auth.uid() = user_id);

-- 2. When leaving a tree, also release the linked user_id from the member node 
-- so the slot returns to unclaimed status for subsequent invitees.
drop policy if exists "users can unlink themselves from member node" on members;
create policy "users can unlink themselves from member node" on members
  for update using (auth.uid() = user_id)
  with check (user_id is null);
