-- 1. Add Helper Function to check tree public status efficiently
create or replace function is_tree_public(tid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from trees
    where id = tid and visibility = 'public'
  );
$$;

-- 2. Update RLS policies for Trees
drop policy if exists "users can read their trees" on trees;
create policy "users can read their trees" on trees
  for select using (
    auth.uid() = owner_id 
    or is_tree_member(id)
    or visibility = 'public'
  );

-- 3. Update RLS policies for Members
drop policy if exists "tree members can read members" on members;
create policy "tree members can read members" on members
  for select using (
    is_tree_member(tree_id)
    or is_tree_public(tree_id)
  );

-- 4. Update RLS policies for Relationships
drop policy if exists "tree members can read relationships" on relationships;
create policy "tree members can read relationships" on relationships
  for select using (
    is_tree_member(tree_id)
    or is_tree_public(tree_id)
  );

-- 5. Update claim_invite RPC to allow multi-use general invites
-- Personal invites (where member_id is populated) remain single-use.
create or replace function claim_invite(token_param text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invite record;
  current_uid uuid;
begin
  -- Get current user
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Locate and lock the invite row
  select * into target_invite
  from invites
  where token = token_param
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  -- Validation checks
  -- If it's a PERSONAL invite (member_id is set), strictly enforce single-use claiming.
  -- If it's a GENERAL invite (member_id IS NULL), skip this check to allow multi-use!
  if target_invite.member_id is not null and target_invite.claimed_by is not null then
    raise exception 'This personal invite has already been claimed';
  end if;

  if target_invite.expires_at is not null and target_invite.expires_at < now() then
    raise exception 'Invite has expired';
  end if;

  -- Step 1: Join the tree (Safe Upsert)
  insert into tree_members (tree_id, user_id, role)
  values (target_invite.tree_id, current_uid, target_invite.role)
  on conflict (tree_id, user_id) do nothing;

  -- Step 2: Link the node to user if it is a personal invite
  if target_invite.member_id is not null then
    update members
    set user_id = current_uid
    where id = target_invite.member_id
      and user_id is null; -- safety: don't overwrite if someone manually linked already
  end if;

  -- Step 3: Update claiming stats (tracks who last used it / who claimed it)
  update invites
  set claimed_by = current_uid,
      claimed_at = now()
  where id = target_invite.id;

  return jsonb_build_object(
    'success', true,
    'tree_id', target_invite.tree_id
  );

exception
  when others then
    raise;
end;
$$;
