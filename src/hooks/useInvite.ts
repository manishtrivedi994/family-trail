import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Invite, MemberRole } from '../types'

export interface InviteWithJoins extends Invite {
  trees: { name: string; owner_id: string } | null
  members: { name: string } | null
}

export type InviteWithMember = Invite & { members: { name: string } | null }

export async function createInvite(
  treeId: string,
  memberId: string | null,
  role: MemberRole,
  expiresInMs: number | null,
): Promise<Invite> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Not authenticated')

  const token = crypto.randomUUID()
  const expires_at = expiresInMs
    ? new Date(Date.now() + expiresInMs).toISOString()
    : null

  const { data, error } = await supabase
    .from('invites')
    .insert({ tree_id: treeId, member_id: memberId, token, role, created_by: user.id, expires_at })
    .select()
    .single()

  if (error) throw error
  return data as Invite
}

export function getInviteUrl(token: string): string {
  const baseUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
  return `${baseUrl}/join/${token}`
}

export async function fetchInviteByToken(token: string): Promise<InviteWithJoins | null> {
  const { data, error } = await supabase
    .from('invites')
    .select('*, trees(name, owner_id), members(name)')
    .eq('token', token)
    .single()

  if (error) return null
  return data as InviteWithJoins
}

export async function fetchTreeInvites(treeId: string): Promise<InviteWithMember[]> {
  const { data } = await supabase
    .from('invites')
    .select('*, members(name)')
    .eq('tree_id', treeId)
    .order('created_at', { ascending: false })

  return (data ?? []) as InviteWithMember[]
}

export async function claimInvite(invite: Invite, userId: string): Promise<void> {
  await supabase.from('tree_members').upsert({
    tree_id: invite.tree_id,
    user_id: userId,
    role: invite.role,
  })

  if (invite.member_id) {
    await supabase
      .from('members')
      .update({ user_id: userId })
      .eq('id', invite.member_id)
  }

  await supabase
    .from('invites')
    .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq('id', invite.id)
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invites').delete().eq('id', inviteId)
  if (error) throw error
}

export function getInviteStatus(invite: Invite): 'claimed' | 'expired' | 'pending' {
  if (invite.claimed_by) return 'claimed'
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return 'expired'
  return 'pending'
}
