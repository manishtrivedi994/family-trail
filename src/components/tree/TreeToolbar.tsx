import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Crosshair, Crown, Download, LogOut, MoreHorizontal, Search, Settings, Share2, UserPlus, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTreeStore } from '../../store/treeStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import type { MemberRole } from '../../types'

interface ContributorInfo {
  user_id: string
  role: MemberRole
  display: string
}

interface TreeToolbarProps {
  onAddMember: () => void
  onFocusMe: () => void
  onShare: () => void
  onExport: () => void
  onSearch: () => void
  canEdit: boolean
  isOnline: boolean
}

export function TreeToolbar({ onAddMember, onFocusMe, onShare, onExport, onSearch, canEdit, isOnline }: TreeToolbarProps) {
  const navigate = useNavigate()
  const tree = useTreeStore((s) => s.tree)
  const members = useTreeStore((s) => s.members)
  const myRole = useTreeStore((s) => s.myRole)
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  const [showOverflow, setShowOverflow] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  const [showContributors, setShowContributors] = useState(false)
  const [contributorList, setContributorList] = useState<ContributorInfo[]>([])
  const [loadingContributors, setLoadingContributors] = useState(false)
  const contributorsRef = useRef<HTMLDivElement>(null)

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?'

  const contributorCount = useMemo(
    () => new Set(members.map((m) => m.created_by)).size,
    [members]
  )

  const isOwnerInTree = members.some((m) => m.user_id === user?.id)
  const canChangeSettings = myRole === 'owner'
  const isViewer = myRole === 'viewer'

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false)
      }
    }
    if (showOverflow) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showOverflow])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (contributorsRef.current && !contributorsRef.current.contains(e.target as Node)) {
        setShowContributors(false)
      }
    }
    if (showContributors) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showContributors])

  async function handleOpenContributors() {
    setShowContributors((v) => !v)
    if (contributorList.length > 0 || !tree) return
    setLoadingContributors(true)
    try {
      const { data: treeMembers } = await supabase
        .from('tree_members')
        .select('user_id, role')
        .eq('tree_id', tree.id)
      if (!treeMembers) return

      const userIds = treeMembers.map((m: { user_id: string }) => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)

      const profileMap = new Map(
        (profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name])
      )

      setContributorList(
        treeMembers.map((m: { user_id: string; role: string }) => ({
          user_id: m.user_id,
          role: m.role as MemberRole,
          display: (profileMap.get(m.user_id) as string | null) ?? m.user_id.slice(0, 8) + '…',
        }))
      )
    } finally {
      setLoadingContributors(false)
    }
  }

  async function handleLeaveTree() {
    if (!tree || !user || myRole === 'owner') return
    setShowOverflow(false)
    const ok = window.confirm(`Leave "${tree.name}"? You'll need a new invite to rejoin.`)
    if (!ok) return
    try {
      await supabase
        .from('tree_members')
        .delete()
        .eq('tree_id', tree.id)
        .eq('user_id', user.id)
      addToast('You left the tree', 'info')
      navigate('/dashboard')
    } catch {
      addToast('Failed to leave tree', 'error')
    }
  }

  return (
    <header className="bg-ft-bg2/90 backdrop-blur border-b border-ft-border px-4 h-[52px] flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={17} />
        </button>

        <span className="font-display text-base font-semibold text-ft-text truncate max-w-[140px] sm:max-w-xs">
          {tree?.name ?? '…'}
        </span>

        {members.length > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-bg4 border border-ft-border text-[11px] text-ft-text2 font-medium">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        )}

        {contributorCount > 1 && (
          <div className="relative hidden sm:block" ref={contributorsRef}>
            <button
              onClick={handleOpenContributors}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-bg4 border border-ft-border text-[11px] text-ft-teal font-medium hover:border-ft-teal/30 hover:bg-ft-teal/10 transition-colors"
            >
              <Users size={11} />
              {contributorCount} contributors
            </button>

            {showContributors && (
              <div className="absolute left-0 top-full mt-1.5 bg-ft-bg3 border border-ft-border2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-2 min-w-[200px] z-50">
                <p className="px-4 pb-1.5 text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Contributors</p>
                {loadingContributors ? (
                  <div className="px-4 py-2 text-xs text-ft-text3">Loading…</div>
                ) : (
                  contributorList.map((c) => (
                    <div key={c.user_id} className="flex items-center justify-between px-4 py-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {c.display.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-xs text-ft-text truncate">{c.display}</span>
                      </div>
                      {c.role === 'owner' && (
                        <Crown size={11} className="text-ft-gold shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {isOnline ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/30 text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-gold/10 border border-ft-gold/20 text-[11px] text-ft-gold font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-ft-gold" />
            Offline
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* View-only badge */}
        {isViewer && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full border border-ft-border text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
            View only
          </span>
        )}

        {isOwnerInTree && (
          <button
            onClick={onFocusMe}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 hover:border-ft-border2 transition-all"
            aria-label="Focus on my node"
            title="Focus on me"
          >
            <Crosshair size={14} />
            <span>Focus on me</span>
          </button>
        )}

        <button
          onClick={onSearch}
          className="hidden sm:flex p-2 rounded-xl text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
          aria-label="Search members"
        >
          <Search size={16} />
        </button>

        <button
          onClick={onShare}
          className="hidden sm:flex p-2 rounded-xl text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
          aria-label="Share tree"
        >
          <Share2 size={16} />
        </button>

        {canEdit && (
          <button
            onClick={onAddMember}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ft-v500 hover:bg-ft-v600 text-white text-xs font-semibold transition-colors"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Add member</span>
          </button>
        )}

        {/* Overflow menu */}
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow((v) => !v)}
            className="p-2 rounded-xl text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal size={16} />
          </button>

          {showOverflow && (
            <div className="absolute right-0 top-full mt-1.5 bg-ft-bg3 border border-ft-border2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-1 w-52 z-50">
              {isOwnerInTree && (
                <button
                  onClick={() => { setShowOverflow(false); onFocusMe() }}
                  className="w-full px-4 py-2.5 text-sm text-ft-text2 hover:bg-ft-border hover:text-ft-text transition-colors flex items-center gap-2 text-left"
                >
                  <Crosshair size={14} className="text-ft-v400" />
                  Focus on me
                </button>
              )}
              <button
                onClick={() => { setShowOverflow(false); onExport() }}
                className="w-full px-4 py-2.5 text-sm text-ft-text2 hover:bg-ft-border hover:text-ft-text transition-colors flex items-center gap-2 text-left"
              >
                <Download size={14} className="text-ft-v400" />
                Export as PNG
              </button>
              {canChangeSettings && (
                <button
                  onClick={() => { setShowOverflow(false); navigate(`/tree/${tree?.id}/settings`) }}
                  className="w-full px-4 py-2.5 text-sm text-ft-text2 hover:bg-ft-border hover:text-ft-text transition-colors flex items-center gap-2 text-left"
                >
                  <Settings size={14} className="text-ft-v400" />
                  Tree settings
                </button>
              )}
              {myRole !== 'owner' && (
                <>
                  <div className="my-1 border-t border-ft-border" />
                  <button
                    onClick={handleLeaveTree}
                    className="w-full px-4 py-2.5 text-sm text-ft-rose hover:bg-rose-950/30 transition-colors flex items-center gap-2 text-left"
                  >
                    <LogOut size={14} />
                    Leave tree
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v700 flex items-center justify-center text-[11px] font-bold text-white ml-1">
          {initials}
        </div>
      </div>
    </header>
  )
}
