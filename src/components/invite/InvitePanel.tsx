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
import type { InviteWithMember } from '../../hooks/useInvite'
import type { MemberRole } from '../../types'

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
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

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
      if (tab === 'manage') loadInvites()
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function loadInvites() {
    setLoadingInvites(true)
    try {
      const data = await fetchTreeInvites(treeId)
      setInvites(data)
    } catch {
      addToast('Failed to load invites', 'error')
    } finally {
      setLoadingInvites(false)
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
                    <option key={m.id} value={m.id}>
                      {m.name}{m.user_id ? ' (linked)' : ''}
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
              {loadingInvites ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 rounded-full border-2 border-ft-v500 border-t-transparent animate-spin" />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-12">
                  <Share2 size={28} className="text-ft-text3 mx-auto mb-3" />
                  <p className="text-sm text-ft-text3">No invites yet</p>
                  <p className="text-xs text-ft-text3 mt-1">
                    Generate a link on the Share tab
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {invites.map((invite) => {
                    const status = getInviteStatus(invite)
                    return (
                      <div
                        key={invite.id}
                        className="bg-ft-bg3 border border-ft-border rounded-xl p-3.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot[status]}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ft-text truncate">
                                {invite.members?.name ?? 'General invite'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider ${roleBadge[invite.role]}`}>
                                  {invite.role}
                                </span>
                                <span className="text-[11px] text-ft-text3">
                                  {status === 'claimed' ? 'Accepted' : status === 'expired' ? 'Expired' : 'Awaiting…'}
                                </span>
                              </div>
                              <p className="text-[11px] text-ft-text3 mt-1">
                                <Clock size={10} className="inline mr-1" />
                                {formatExpiry(invite.expires_at)}
                              </p>
                            </div>
                          </div>

                          {status !== 'claimed' && (
                            <button
                              onClick={() => handleRevoke(invite.id)}
                              disabled={revokingId === invite.id}
                              className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-rose hover:bg-rose-950/30 transition-colors shrink-0 disabled:opacity-40"
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
                    )
                  })}
                </div>
              )}

              <button
                onClick={loadInvites}
                className="w-full py-2 text-xs text-ft-text3 hover:text-ft-text2 transition-colors"
              >
                <Users size={11} className="inline mr-1.5" />
                Refresh
              </button>
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}
