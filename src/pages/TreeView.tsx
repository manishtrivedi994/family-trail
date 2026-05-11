import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, GitBranch, Home, Search, User, UserPlus, WifiOff } from 'lucide-react'
import { useTree } from '../hooks/useTree'
import { useTreeStore } from '../store/treeStore'
import { useAuthStore } from '../store/authStore'
import { buildFlowGraph, findCycles } from '../lib/treeUtils'
import { trackEvent } from '../lib/analytics'
import { TreeCanvas } from '../components/tree/TreeCanvas'
import { TreeToolbar } from '../components/tree/TreeToolbar'
import { MemberFormModal } from '../components/tree/MemberFormModal'
import { MemberSidebar } from '../components/tree/MemberSidebar'
import { RelationshipsPanel } from '../components/tree/RelationshipsPanel'
import { SearchOverlay } from '../components/tree/SearchOverlay'
import { InvitePanel } from '../components/invite/InvitePanel'
import { LogoMark } from '../components/ui/LogoMark'
import type { Member, MemberSide } from '../types'

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}


interface NavItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  onClick: () => void
  active?: boolean
}

function NavItem({ icon: Icon, label, onClick, active = false }: NavItemProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 px-4 py-2 relative">
      <Icon size={22} className={active ? 'text-ft-v200' : 'text-ft-text3'} />
      <span className={`text-[10px] font-medium ${active ? 'text-ft-v200' : 'text-ft-text3'}`}>{label}</span>
      {active && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ft-v400" />
      )}
    </button>
  )
}

// Skeleton nodes for loading state
function TreeSkeleton() {
  const nodes = [
    { top: '25%', left: '42%', delay: 0 },
    { top: '42%', left: '25%', delay: 0.1 },
    { top: '42%', left: '58%', delay: 0.2 },
    { top: '60%', left: '15%', delay: 0.3 },
    { top: '60%', left: '35%', delay: 0.15 },
    { top: '60%', left: '65%', delay: 0.25 },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden">
      {nodes.map((n, i) => (
        <div
          key={i}
          className="absolute w-36 h-16 bg-ft-bg4 rounded-xl border border-ft-border animate-shimmer"
          style={{ top: n.top, left: n.left, animationDelay: `${n.delay}s` }}
        />
      ))}
    </div>
  )
}

export function TreeView() {
  const { id: treeId = '' } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const urlFocusId  = searchParams.get('focus')
  const isNewMember = searchParams.get('newMember') === 'true'

  const [showAddModal,       setShowAddModal]       = useState(false)
  const [addRelativeMemberId, setAddRelativeMemberId] = useState<string | null>(null)
  const [editingMember,    setEditingMember]    = useState<Member | null>(null)
  const [connectionMember, setConnectionMember] = useState<Member | null>(null)
  const [focusTarget,      setFocusTarget]      = useState<string | null>(null)
  const [showInvitePanel,  setShowInvitePanel]  = useState(false)
  const [invitePreselect,  setInvitePreselect]  = useState<string | null>(null)
  const [showWelcome,      setShowWelcome]      = useState(false)
  const [exportTrigger,    setExportTrigger]    = useState(0)
  const [showSearch,       setShowSearch]       = useState(false)

  const isOnline = useOnlineStatus()

  useTree(treeId)

  const loading       = useTreeStore((s) => s.loading)
  const tree          = useTreeStore((s) => s.tree)
  const members       = useTreeStore((s) => s.members)
  const relationships = useTreeStore((s) => s.relationships)
  const myRole        = useTreeStore((s) => s.myRole)
  const user          = useAuthStore((s) => s.user)

  const canEdit = (myRole === 'owner' || myRole === 'editor') && isOnline

  const ownerMember = useMemo(
    () => members.find((m) => m.user_id === user?.id) ?? null,
    [members, user?.id],
  )

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(members, relationships, ownerMember?.id ?? ''),
    [members, relationships, ownerMember?.id],
  )

  const sideMap = useMemo(() => {
    const m: Record<string, MemberSide> = {}
    nodes.forEach((n) => { m[n.id] = (n.data as { side: MemberSide }).side })
    return m
  }, [nodes])

  const cycles = useMemo(() => findCycles(relationships), [relationships])

  const isEmpty       = members.length === 0
  const isFirstMember = !ownerMember
  const activeFocusId = urlFocusId ?? focusTarget

  // Post-claim onboarding
  useEffect(() => {
    if (!isNewMember || loading) return
    const key = `ft_welcomed_${treeId}`
    // Defer side effect processing out of sync render commit to prevent React state collision warnings
    const t = setTimeout(() => {
      if (!localStorage.getItem(key)) setShowWelcome(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('newMember')
        return next
      }, { replace: true })
    }, 0)
    return () => clearTimeout(t)
  }, [isNewMember, loading, treeId, setSearchParams])

  // Track page view when tree loads
  useEffect(() => {
    if (tree) trackEvent('tree_viewed', { tree_id: treeId })
  }, [tree, treeId])

  function dismissWelcome(addParents = false) {
    localStorage.setItem(`ft_welcomed_${treeId}`, '1')
    setShowWelcome(false)
    if (addParents) setShowAddModal(true)
  }

  function handleEdit(member: Member) { setEditingMember(member) }
  function handleAddRelative(member: Member) { setAddRelativeMemberId(member.id) }
  function handleAddConnection(member: Member) { setConnectionMember(member) }
  function openCyclePanel() {
    if (cycles.length > 0 && cycles[0].length > 0) {
      const m = members.find(m => m.id === cycles[0][0])
      if (m) setConnectionMember(m)
    }
  }
  function handleFocusMe() { if (ownerMember) setFocusTarget(ownerMember.id) }

  function handleInvite(member: Member) {
    setInvitePreselect(member.id)
    setShowInvitePanel(true)
    trackEvent('invite_generated', { tree_id: treeId })
  }

  function handleShare() {
    setInvitePreselect(null)
    setShowInvitePanel(true)
  }

  function handleExport() {
    setExportTrigger((t) => t + 1)
    trackEvent('tree_exported', { tree_id: treeId })
  }

  function handleSearchSelect(memberId: string) {
    setFocusTarget(memberId)
    useTreeStore.getState().setSelectedMember(memberId)
    trackEvent('search_used', { tree_id: treeId })
  }

  return (
    <div className="flex flex-col bg-ft-bg h-screen overflow-hidden">
      <TreeToolbar
        onAddMember={() => setShowAddModal(true)}
        onFocusMe={handleFocusMe}
        onShare={handleShare}
        onExport={handleExport}
        onSearch={() => setShowSearch(true)}
        canEdit={canEdit}
        isOnline={isOnline}
      />

      {!isOnline && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-2 px-4 bg-ft-gold/10 border-b border-ft-gold/20 text-ft-gold text-xs text-center">
          <WifiOff size={12} />
          You're offline — viewing cached tree. Changes will sync when reconnected.
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <TreeSkeleton />
        ) : (
          <ReactFlowProvider>
            <TreeCanvas
              nodes={nodes}
              edges={edges}
              focusMemberId={activeFocusId}
              exportTrigger={exportTrigger}
              treeName={tree?.name ?? 'family_tree'}
            />

            {cycles.length > 0 && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm shadow-lg max-w-sm text-center pointer-events-auto">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>
                  This tree has {cycles.length} conflicting connection{cycles.length > 1 ? 's' : ''}. Open the{' '}
                  <button onClick={openCyclePanel} className="underline hover:text-rose-200">
                    relationships panel
                  </button>
                  {' '}to fix them.
                </span>
              </div>
            )}

            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-ft-bg3 border border-ft-border flex items-center justify-center mx-auto mb-4">
                    <UserPlus size={26} className="text-ft-v400" />
                  </div>
                  <p className="font-display text-xl font-semibold text-ft-text mb-1">
                    Your tree is empty
                  </p>
                  <p className="text-ft-text3 text-sm mb-5">
                    Add the first member to get started
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl px-6 py-2.5 text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(124,92,255,0.4)] transition-all"
                    >
                      Add the first member
                    </button>
                  )}
                </div>
              </div>
            )}

            <MemberSidebar
              sideMap={sideMap}
              treeId={treeId}
              myMemberId={ownerMember?.id ?? null}
              onEdit={handleEdit}
              onAddConnection={handleAddConnection}
              onInvite={handleInvite}
              onAddRelative={handleAddRelative}
            />

            {/* Search overlay */}
            <AnimatePresence>
              {showSearch && (
                <SearchOverlay
                  members={members}
                  sideMap={sideMap}
                  onSelect={handleSearchSelect}
                  onClose={() => setShowSearch(false)}
                />
              )}
            </AnimatePresence>
          </ReactFlowProvider>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex items-center justify-around bg-ft-bg2/95 backdrop-blur border-t border-ft-border pb-[env(safe-area-inset-bottom)] shrink-0">
        <NavItem icon={Home}      label="Home"   onClick={() => navigate('/dashboard')} />
        <NavItem icon={GitBranch} label="Tree"   onClick={() => {}} active={true} />
        <NavItem icon={Search}    label="Search" onClick={() => setShowSearch(true)} />
        <NavItem
          icon={User}
          label="Profile"
          onClick={() => ownerMember && navigate(`/tree/${treeId}/member/${ownerMember.id}`)}
        />
      </nav>

      {/* Modals */}
      {canEdit && (showAddModal || addRelativeMemberId !== null) && (
        <MemberFormModal
          treeId={treeId}
          ownerMemberId={ownerMember?.id ?? null}
          isFirstMember={isFirstMember}
          initialAnchorMemberId={addRelativeMemberId ?? undefined}
          onClose={() => { setShowAddModal(false); setAddRelativeMemberId(null) }}
        />
      )}
      {canEdit && editingMember && (
        <MemberFormModal
          treeId={treeId}
          ownerMemberId={ownerMember?.id ?? null}
          isFirstMember={false}
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      )}
      {canEdit && connectionMember && (
        <RelationshipsPanel
          member={connectionMember}
          onClose={() => setConnectionMember(null)}
        />
      )}

      <AnimatePresence>
        {showInvitePanel && (
          <InvitePanel
            treeId={treeId}
            preselectedMemberId={invitePreselect}
            onClose={() => { setShowInvitePanel(false); setInvitePreselect(null) }}
          />
        )}
      </AnimatePresence>

      {/* Post-claim welcome overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ft-bg/90 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-ft-bg2 border border-ft-border2 rounded-3xl p-8 w-full max-w-md text-center"
            >
              <div className="flex justify-center mb-5"><LogoMark size={24} /></div>
              <h2 className="font-display text-3xl font-bold text-ft-text mb-2">Welcome to the family tree</h2>
              <p className="text-ft-text2 text-sm leading-relaxed mb-6">
                {ownerMember
                  ? <>You've been added as <span className="text-ft-v200 font-medium">{ownerMember.name}</span>. Now add your side of the family.</>
                  : "You've joined the tree. Start adding your side of the family."
                }
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => dismissWelcome(true)}
                  className="bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl px-8 py-3.5 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,92,255,0.45)] transition-all w-full"
                >
                  <GitBranch size={15} className="inline mr-2 -mt-0.5" />
                  Add my parents
                </button>
                <button
                  onClick={() => dismissWelcome(false)}
                  className="border border-ft-border2 text-ft-v200 rounded-2xl px-8 py-3.5 hover:bg-ft-border hover:border-ft-border3 transition-all w-full text-sm font-medium"
                >
                  Explore the tree first
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
