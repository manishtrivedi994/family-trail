import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, Check, Link2, Users, Clock, Share2, Mail, MessageSquare, Trash2 } from 'lucide-react'
import { useTreeStore } from '../../store/treeStore'
import { useToastStore } from '../../store/toastStore'
import {
  createInvite,
  fetchTreeInvites,
  getInviteUrl,
  getInviteStatus,
  revokeInvite,
} from '../../hooks/useInvite'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { InviteWithMember } from '../../hooks/useInvite'
import type { MemberRole } from '../../types'

interface ContributorRow {
  user_id: string
  role: MemberRole
  display: string
}

interface InvitePanelProps {
  treeId: string
  preselectedMemberId?: string | null
  onClose: () => void
}

type Tab = 'share' | 'manage'

const EXPIRY_OPTIONS = [
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Never', value: null },
] as const

const statusDot: Record<ReturnType<typeof getInviteStatus>, string> = {
  claimed: 'bg-ft-teal',
  pending: 'bg-ft-gold',
  expired: 'bg-ft-rose',
}

const roleBadge: Record<MemberRole, string> = {
  owner: 'bg-ft-v500/20 text-ft-v200 border border-ft-v500/30',
  editor: 'bg-ft-teal/10 text-ft-teal border border-ft-teal/20',
  viewer: 'bg-ft-gold/10 text-ft-gold border border-ft-gold/20',
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Never expires'
  const d = new Date(expiresAt)
  if (d < new Date()) return 'Expired'
  return `Expires ${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
}

export function InvitePanel({ treeId, preselectedMemberId, onClose }: InvitePanelProps) {
  const tree = useTreeStore((s) => s.tree)
  const members = useTreeStore((s) => s.members)
  const addToast = useToastStore((s) => s.addToast)

  const [tab, setTab] = useState<Tab>('share')
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preselectedMemberId ?? '')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [expiryIdx, setExpiryIdx] = useState(1) // 7 days default
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [invites, setInvites] = useState<InviteWithMember[]>([])
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [updatingContributorId, setUpdatingContributorId] = useState<string | null>(null)
  const [updatingInviteId, setUpdatingInviteId] = useState<string | null>(null)

  const currentUser = useAuthStore((s) => s.user)
  const isOwner = tree?.owner_id === currentUser?.id

  useEffect(() => {
    const t = setTimeout(() => {
      if (preselectedMemberId !== undefined) {
        setSelectedMemberId(preselectedMemberId ?? '')
      }
    }, 0)
    return () => clearTimeout(t)
  }, [preselectedMemberId])

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === 'manage') loadAllManagementData()
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function loadAllManagementData() {
    setLoadingData(true)
    try {
      // Load Invites
      const invitesData = await fetchTreeInvites(treeId)
      setInvites(invitesData)

      // Load Contributors
      const { data: memberRows } = await supabase
        .from('tree_members')
        .select('user_id, role')
        .eq('tree_id', treeId)
      
      if (memberRows && memberRows.length > 0) {
        const uids = memberRows.map((r) => r.user_id)
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', uids)
        
        const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]))
        
        setContributors(memberRows.map((m) => {
          const profileName = profileMap.get(m.user_id)
          const linkedMemberName = members.find((mem) => mem.user_id === m.user_id)?.name
          const isCurrent = m.user_id === currentUser?.id
          
          // Preference: 1. Profile Name, 2. Linked Family Member Name, 3. Email (if self), 4. Short UUID
          const displayName = profileName 
            || linkedMemberName 
            || (isCurrent ? currentUser?.email : null)
            || `User ${m.user_id.slice(0, 6)}`

          return {
            user_id: m.user_id,
            role: m.role as MemberRole,
            display: displayName,
          }
        }))
      }
    } catch (err) {
      console.error(err)
      addToast('Failed to load management data', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  async function updateContributorRole(userId: string, newRole: MemberRole) {
    setUpdatingContributorId(userId)
    try {
      const { error } = await supabase
        .from('tree_members')
        .update({ role: newRole })
        .eq('tree_id', treeId)
        .eq('user_id', userId)
      
      if (error) throw error

      setContributors(prev => prev.map(c => c.user_id === userId ? { ...c, role: newRole } : c))
      addToast('Role updated successfully', 'success')
    } catch {
      addToast('Failed to update user role', 'error')
    } finally {
      setUpdatingContributorId(null)
    }
  }

  async function updateInviteRole(inviteId: string, newRole: MemberRole) {
    setUpdatingInviteId(inviteId)
    try {
      const { error } = await supabase
        .from('invites')
        .update({ role: newRole })
        .eq('id', inviteId)
      
      if (error) throw error

      setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, role: newRole } : i))
      addToast('Invite updated successfully', 'success')
    } catch {
      addToast('Failed to update invite configuration', 'error')
    } finally {
      setUpdatingInviteId(null)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGeneratedUrl(null)
    try {
      const expiresInMs = EXPIRY_OPTIONS[expiryIdx].value
      const invite = await createInvite(
        treeId,
        selectedMemberId || null,
        role,
        expiresInMs as number | null,
      )
      setGeneratedUrl(getInviteUrl(invite.token))
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to generate invite', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    addToast('Link copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyInvite(token: string) {
    const url = getInviteUrl(token)
    await navigator.clipboard.writeText(url)
    addToast('Link copied to clipboard', 'success')
  }

  function handleShareWhatsApp() {
    if (!generatedUrl) return
    const text = `Join our family tree on Family Trail: ${generatedUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function handleShareEmail() {
    if (!generatedUrl) return
    const subject = encodeURIComponent(`You're invited to our family tree`)
    const body = encodeURIComponent(`Hi,\n\nI'd like you to join our family tree on Family Trail.\n\nClick the link to join: ${generatedUrl}\n\nSee you there!`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  async function handleRevoke(inviteId: string) {
    setRevokingId(inviteId)
    try {
      await revokeInvite(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      addToast('Invite revoked', 'info')
    } catch {
      addToast('Failed to revoke invite', 'error')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-ft-bg2 border-l border-ft-border z-30 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-ft-border">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-ft-text">
                Invite to {tree?.name ?? 'tree'}
              </h2>
              <p className="text-ft-text3 text-xs mt-0.5">
                Share this link with a family member
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-ft-bg3 p-1 rounded-xl">
            {(['share', 'manage'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? 'bg-ft-bg4 text-ft-text border border-ft-border'
                    : 'text-ft-text3 hover:text-ft-text2'
                }`}
              >
                {t === 'share' ? 'Share link' : 'Manage'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'share' && (
            <>
              {/* Member selector */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium block mb-2">
                  Who are you inviting?
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value)
                    setGeneratedUrl(null)
                  }}
                  className="w-full bg-ft-bg3 border border-ft-border rounded-xl px-3 py-2.5 text-sm text-ft-text focus:border-ft-border3 focus:outline-none transition-colors"
                >
                  <option value="">Don't link to a specific person</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id} disabled={!!m.user_id}>
                      {m.name}{m.user_id ? ' (already linked)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role selector */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium block mb-2">
                  Permission
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['editor', 'viewer'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRole(r); setGeneratedUrl(null) }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === r
                          ? r === 'editor'
                            ? 'border-ft-v500/50 bg-ft-v500/15 text-ft-v200'
                            : 'border-ft-gold/40 bg-ft-gold/10 text-ft-gold'
                          : 'border-ft-border bg-ft-bg3 text-ft-text3 hover:border-ft-border2'
                      }`}
                    >
                      <p className="text-xs font-semibold capitalize">{r}</p>
                      <p className="text-[11px] mt-0.5 opacity-70">
                        {r === 'editor' ? 'Can add and edit members' : 'Can only view the tree'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium block mb-2">
                  <Clock size={10} className="inline mr-1" />
                  Link expires in
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {EXPIRY_OPTIONS.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setExpiryIdx(idx); setGeneratedUrl(null) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        expiryIdx === idx
                          ? 'border-ft-border3 bg-ft-bg4 text-ft-text'
                          : 'border-ft-border text-ft-text3 hover:border-ft-border2 hover:text-ft-text2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              {!generatedUrl ? (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl py-3 text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(124,92,255,0.4)] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {generating ? 'Generating…' : 'Generate invite link'}
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-ft-teal font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ft-teal animate-pulse" />
                    Link generated — share it before it expires
                  </p>

                  {/* Link row */}
                  <div className="flex items-center gap-2 bg-ft-bg3 border border-ft-border rounded-xl px-3 py-2.5">
                    <Link2 size={13} className="text-ft-text3 shrink-0" />
                    <span className="text-xs text-ft-text2 flex-1 truncate min-w-0">
                      {generatedUrl}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-ft-bg4 transition-colors text-ft-text3 hover:text-ft-text"
                    >
                      {copied ? <Check size={13} className="text-ft-teal" /> : <Copy size={13} />}
                    </button>
                  </div>

                  {/* Share buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ft-border bg-ft-bg3 text-ft-text2 text-xs font-medium hover:border-ft-border2 hover:text-ft-text transition-all"
                    >
                      <MessageSquare size={13} />
                      WhatsApp
                    </button>
                    <button
                      onClick={handleShareEmail}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ft-border bg-ft-bg3 text-ft-text2 text-xs font-medium hover:border-ft-border2 hover:text-ft-text transition-all"
                    >
                      <Mail size={13} />
                      Email
                    </button>
                  </div>

                  <button
                    onClick={() => setGeneratedUrl(null)}
                    className="w-full py-2 text-xs text-ft-text3 hover:text-ft-text2 transition-colors"
                  >
                    Generate another link
                  </button>
                </motion.div>
              )}
            </>
          )}

          {tab === 'manage' && (
            <>
              {loadingData ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 rounded-full border-2 border-ft-v500 border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Contributors Section */}
                  {contributors.length > 0 && (
                    <div>
                      <h3 className="text-[10px] uppercase tracking-widest text-ft-text3 font-semibold mb-3 px-1 flex items-center gap-1.5">
                        <Users size={12} />
                        Members ({contributors.length})
                      </h3>
                      <div className="bg-ft-bg3 border border-ft-border rounded-xl overflow-hidden divide-y divide-ft-border/50">
                        {contributors.map((c) => (
                          <div key={c.user_id} className="p-3 flex items-center justify-between gap-3 bg-ft-bg3 hover:bg-ft-bg4/30 transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ft-text truncate">
                                {c.display}
                                {c.user_id === currentUser?.id && <span className="text-[11px] opacity-60 ml-1">(you)</span>}
                              </p>
                            </div>
                            {isOwner && c.user_id !== currentUser?.id && c.role !== 'owner' ? (
                              <div className="relative">
                                {updatingContributorId === c.user_id ? (
                                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin text-ft-text3" />
                                ) : (
                                  <select
                                    value={c.role}
                                    onChange={(e) => updateContributorRole(c.user_id, e.target.value as MemberRole)}
                                    className="bg-ft-bg4 border border-ft-border text-xs text-ft-text2 rounded-lg px-2 py-1 outline-none focus:border-ft-border3 cursor-pointer appearance-none"
                                  >
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                  </select>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-ft-bg4 text-ft-text3 rounded-md border border-ft-border uppercase">
                                {c.role}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invites Section */}
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-ft-text3 font-semibold mb-3 px-1 flex items-center gap-1.5">
                      <Share2 size={12} />
                      Pending & Past Invites ({invites.length})
                    </h3>
                    
                    {invites.length === 0 ? (
                      <div className="text-center py-8 bg-ft-bg3/50 rounded-xl border border-ft-border border-dashed">
                        <p className="text-xs text-ft-text3">No invite links generated yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {invites.map((invite) => {
                          const status = getInviteStatus(invite)
                          const invUrl = getInviteUrl(invite.token)
                          return (
                            <div
                              key={invite.id}
                              className="bg-ft-bg3 border border-ft-border rounded-xl p-3.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0 w-full">
                                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot[status]}`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-ft-text truncate">
                                      {invite.members?.name ?? 'General invite'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      {status !== 'claimed' ? (
                                        <div className="relative flex items-center">
                                          {updatingInviteId === invite.id ? (
                                            <div className="w-3.5 h-3.5 border-2 border-ft-v500 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <select
                                              value={invite.role}
                                              onChange={(e) => updateInviteRole(invite.id, e.target.value as MemberRole)}
                                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border cursor-pointer bg-ft-bg3 outline-none focus:ring-1 focus:ring-ft-v500 ${roleBadge[invite.role]}`}
                                            >
                                              <option value="editor" className="bg-ft-bg3 text-ft-text">Editor</option>
                                              <option value="viewer" className="bg-ft-bg3 text-ft-text">Viewer</option>
                                            </select>
                                          )}
                                        </div>
                                      ) : (
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider ${roleBadge[invite.role]}`}>
                                          {invite.role}
                                        </span>
                                      )}
                                      <span className="text-[11px] text-ft-text3">
                                        {status === 'claimed' ? 'Accepted' : status === 'expired' ? 'Expired' : 'Awaiting…'}
                                      </span>
                                    </div>
                                    
                                    {/* Explicitly show generated link URL */}
                                    <div className="mt-2 bg-ft-bg4/50 border border-ft-border rounded-lg px-2 py-1 text-[10px] font-mono text-ft-teal/90 truncate select-all cursor-text" title={invUrl}>
                                      {invUrl}
                                    </div>

                                    <p className="text-[11px] text-ft-text3 mt-1.5">
                                      <Clock size={10} className="inline mr-1" />
                                      {formatExpiry(invite.expires_at)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                  {status === 'pending' && (
                                    <button
                                      onClick={() => handleCopyInvite(invite.token)}
                                      className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-teal hover:bg-ft-teal/10 transition-colors"
                                      title="Copy link"
                                    >
                                      <Copy size={13} />
                                    </button>
                                  )}

                                  {status !== 'claimed' && (
                                    <button
                                      onClick={() => handleRevoke(invite.id)}
                                      disabled={revokingId === invite.id}
                                      className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-rose hover:bg-rose-950/30 transition-colors disabled:opacity-40"
                                      title="Revoke invite"
                                    >
                                      {revokingId === invite.id ? (
                                        <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Trash2 size={13} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={loadAllManagementData}
                className="w-full py-2.5 mt-4 text-xs text-ft-text3 hover:text-ft-text2 border border-ft-border rounded-xl bg-ft-bg3/50 hover:bg-ft-bg3 transition-colors"
              >
                <Users size={11} className="inline mr-1.5" />
                Refresh Management Data
              </button>
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}
