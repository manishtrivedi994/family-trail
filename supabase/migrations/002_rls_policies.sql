-- Enable RLS on all tables
alter table trees enable row level security;
alter table members enable row level security;
alter table relationships enable row level security;
alter table invites enable row level security;
alter table tree_members enable row level security;

-- Helper: check if current user is a member of a tree
create or replace function is_tree_member(tid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from tree_members
    where tree_id = tid and user_id = auth.uid()
  );
$$;

-- Helper: check if current user has editor+ role on a tree
create or replace function is_tree_editor(tid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from tree_members
    where tree_id = tid and user_id = auth.uid() and role in ('owner','editor')
  );
$$;

-- Helper: check if current user has owner role on a tree
create or replace function is_tree_owner(tid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from tree_members
    where tree_id = tid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Trees policies
drop policy if exists "users can read their trees" on trees;
create policy "users can read their trees" on trees
  for select using (auth.uid() = owner_id or is_tree_member(id));

drop policy if exists "users can create trees" on trees;
create policy "users can create trees" on trees
  for insert with check (auth.uid() = owner_id);

drop policy if exists "owners can update their trees" on trees;
create policy "owners can update their trees" on trees
  for update using (auth.uid() = owner_id);

drop policy if exists "owners can delete their trees" on trees;
create policy "owners can delete their trees" on trees
  for delete using (auth.uid() = owner_id);

-- Members policies
drop policy if exists "tree members can read members" on members;
create policy "tree members can read members" on members
  for select using (is_tree_member(tree_id));

drop policy if exists "tree editors can insert members" on members;
create policy "tree editors can insert members" on members
  for insert with check (is_tree_editor(tree_id));

drop policy if exists "tree editors can update members" on members;
create policy "tree editors can update members" on members
  for update using (is_tree_editor(tree_id));

drop policy if exists "tree owners can delete members" on members;
create policy "tree owners can delete members" on members
  for delete using (is_tree_owner(tree_id));

-- Relationships policies
drop policy if exists "tree members can read relationships" on relationships;
create policy "tree members can read relationships" on relationships
  for select using (is_tree_member(tree_id));

drop policy if exists "tree editors can manage relationships" on relationships;
create policy "tree editors can manage relationships" on relationships
  for all using (is_tree_editor(tree_id));

-- Invites policies
drop policy if exists "anyone can read invite by token" on invites;
create policy "anyone can read invite by token" on invites
  for select using (true);

drop policy if exists "tree editors can create invites" on invites;
create policy "tree editors can create invites" on invites
  for insert with check (is_tree_editor(tree_id));

-- Tree members policies
drop policy if exists "users can read their own acl" on tree_members;
create policy "users can read their own acl" on tree_members
  for select using (auth.uid() = user_id);

drop policy if exists "tree members can read acl" on tree_members;
create policy "tree members can read acl" on tree_members
  for select using (is_tree_member(tree_id));

drop policy if exists "owners can manage acl" on tree_members;
create policy "owners can manage acl" on tree_members
  for all using (is_tree_owner(tree_id));

drop policy if exists "users can add themselves to trees" on tree_members;
create policy "users can add themselves to trees" on tree_members
  for insert with check (auth.uid() = user_id);
