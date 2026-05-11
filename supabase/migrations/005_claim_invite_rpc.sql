-- RPC procedure to claim an invite atomically.
-- Executes as SECURITY DEFINER to safely bypass user RLS for editing 
-- nodes and claiming invite records they don't natively own yet.

drop function if exists claim_invite(text);

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
  -- 1. Get current user
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  -- 2. Locate and lock the invite row
  select * into target_invite
  from invites
  where token = token_param
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  -- 3. Validation checks
  if target_invite.claimed_by is not null then
    raise exception 'Invite already claimed';
  end if;

  if target_invite.expires_at is not null and target_invite.expires_at < now() then
    raise exception 'Invite has expired';
  end if;

  -- 4. Step 1: Join the tree
  insert into tree_members (tree_id, user_id, role)
  values (target_invite.tree_id, current_uid, target_invite.role)
  on conflict (tree_id, user_id) do update 
  set role = greatest_role(tree_members.role, target_invite.role); -- custom helper logic maybe? Actually keep it simple.
  -- Revert complexity: just insert, if they are already in, update role if it elevates them, or just do nothing.
  
  -- Simplest insert logic:
  insert into tree_members (tree_id, user_id, role)
  values (target_invite.tree_id, current_uid, target_invite.role)
  on conflict (tree_id, user_id) do nothing;

  -- 5. Step 2: Link the node to user if it is a personal invite
  if target_invite.member_id is not null then
    update members
    set user_id = current_uid
    where id = target_invite.member_id
      and user_id is null; -- safety: don't steal already claimed node
  end if;

  -- 6. Step 3: Mark the invite as claimed
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

grant execute on function claim_invite(text) to authenticated;
