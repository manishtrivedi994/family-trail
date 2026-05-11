-- 7. Fix missing created_at and DELETE policies for invites

-- Add the missing created_at column for proper ordering
alter table invites 
add column if not exists created_at timestamptz not null default now();

-- Add missing DELETE policy to allow tree managers to revoke invites
drop policy if exists "tree editors can revoke invites" on invites;
create policy "tree editors can revoke invites" on invites
  for delete using (is_tree_editor(tree_id));

-- Add missing UPDATE policy to allow tree managers to change invite configuration (e.g. role)
drop policy if exists "tree editors can update invites" on invites;
create policy "tree editors can update invites" on invites
  for update using (is_tree_editor(tree_id));
