-- Create a secure RPC function to fetch invite details by token
-- This is marked SECURITY DEFINER so that unauthenticated users (guests)
-- can view the personalization details of an invite link (like tree name)
-- without needing blanket SELECT permissions on the trees/members tables.

drop function if exists get_invite_by_token(text);

create or replace function get_invite_by_token(token_param text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', i.id,
    'tree_id', i.tree_id,
    'member_id', i.member_id,
    'token', i.token,
    'role', i.role,
    'created_by', i.created_by,
    'expires_at', i.expires_at,
    'claimed_by', i.claimed_by,
    'claimed_at', i.claimed_at,
    'trees', (
      select jsonb_build_object('name', t.name, 'owner_id', t.owner_id) 
      from trees t 
      where t.id = i.tree_id
    ),
    'members', (
      select jsonb_build_object('name', m.name) 
      from members m 
      where m.id = i.member_id
    ),
    'top_member_names', (
      select coalesce(jsonb_agg(m.name), '[]'::jsonb)
      from (
        select name from members where tree_id = i.tree_id limit 8
      ) m
    )
  ) into result
  from invites i
  where i.token = token_param;

  return result;
exception
  when others then
    return null;
end;
$$;

grant execute on function get_invite_by_token(text) to anon, authenticated;
