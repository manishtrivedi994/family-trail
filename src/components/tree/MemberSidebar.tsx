import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil, Link2, Trash2, MapPin, Briefcase, CalendarDays, AlertTriangle, User, UserPlus, GitBranch, Loader2, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTreeStore } from '../../store/treeStore'
import { useToastStore } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'
import { usePermissions } from '../../hooks/usePermissions'
import { findRelationshipPath } from '../../lib/treeUtils'
import type { Member, MemberSide, Relationship, RelationshipType } from '../../types'

const sideLabel: Record<MemberSide, string> = {
  owner: 'You',
  ancestor: 'Ancestor',
  spouse: "Spouse's side",
  child: 'Child',
  unknown: 'Relative',
}

const sideDot: Record<MemberSide, string> = {
  owner: 'bg-ft-v400',
  ancestor: 'bg-ft-v700',
  spouse: 'bg-ft-teal',
  child: 'bg-ft-gold',
  unknown: 'bg-ft-text3',
}

const sideGradient: Record<MemberSide, string> = {
  owner:    'linear-gradient(135deg,#7C5CFF,#9B7AFF)',
  ancestor: 'linear-gradient(135deg,rgba(124,92,255,0.5),rgba(155,122,255,0.4))',
  spouse:   'linear-gradient(135deg,#1BA090,#2DD4BF)',
  child:    'linear-gradient(135deg,#A07820,#D4A843)',
  unknown:  'linear-gradient(135deg,rgba(100,100,100,0.4),rgba(120,120,120,0.3))',
}

const relLabel: Record<string, (isFrom: boolean) => string> = {
  parent_of: (isFrom) => (isFrom ? 'Parent of' : 'Child of'),
  spouse_of: () => 'Spouse of',
  sibling_of: () => 'Sibling of',
}

type UIRelType = 'parent_of_selected' | 'child_of_selected' | 'grandparent_of_selected' | 'spouse_of' | 'sibling_of'

const REL_UI_OPTIONS: { type: UIRelType; label: string }[] = [
  { type: 'parent_of_selected', label: 'Parent of' },
  { type: 'child_of_selected', label: 'Child of' },
  { type: 'grandparent_of_selected', label: 'Grandparent of' },
  { type: 'spouse_of', label: 'Spouse of' },
  { type: 'sibling_of', label: 'Sibling of' },
]

function getUIRelType(rel: Relationship, memberId: string): UIRelType {
  if (rel.type === 'parent_of') {
    return rel.from_id === memberId ? 'parent_of_selected' : 'child_of_selected'
  }
  return rel.type as UIRelType
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

interface MemberSidebarProps {
  sideMap: Record<string, MemberSide>
  treeId: string
  myMemberId: string | null
  onEdit: (member: Member) => void
  onAddConnection: (member: Member) => void
  onInvite: (member: Member) => void
  onAddRelative: (member: Member) => void
}

export function MemberSidebar({ sideMap, treeId, myMemberId, onEdit, onAddConnection, onInvite, onAddRelative }: MemberSidebarProps) {
  const navigate = useNavigate()
  const selectedMemberId = useTreeStore((s) => s.selectedMemberId)
  const setSelectedMember = useTreeStore((s) => s.setSelectedMember)
  const members = useTreeStore((s) => s.members)
  const relationships = useTreeStore((s) => s.relationships)
  const removeMember = useTreeStore((s) => s.removeMember)
  const removeRelationship = useTreeStore((s) => s.removeRelationship)
  const upsertRelationship = useTreeStore((s) => s.upsertRelationship)
  const upsertMember = useTreeStore((s) => s.upsertMember)
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const { canEdit, canDelete, canInvite } = usePermissions()
  const isMobile = useIsMobile()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPath, setShowPath] = useState(false)
  const [editingRelId, setEditingRelId] = useState<string | null>(null)
  const [editRelType, setEditRelType] = useState<UIRelType>('parent_of_selected')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmRemoveRelId, setConfirmRemoveRelId] = useState<string | null>(null)
  const [removingRelId, setRemovingRelId] = useState<string | null>(null)

  const member = members.find((m) => m.id === selectedMemberId) ?? null
  const side = member ? (sideMap[member.id] ?? 'unknown') : 'unknown'

  useEffect(() => {
    setConfirmDelete(false)
    setShowPath(false)
    setEditingRelId(null)
    setConfirmRemoveRelId(null)
  }, [selectedMemberId])

  const connections = relationships
    .filter((r) => r.from_id === selectedMemberId || r.to_id === selectedMemberId)
    .map((r) => {
      const isFrom = r.from_id === selectedMemberId
      const otherId = isFrom ? r.to_id : r.from_id
      const other = members.find((m) => m.id === otherId)
      return other ? { rel: r, other, isFrom } : null
    })
    .filter(Boolean) as { rel: typeof relationships[0]; other: Member; isFrom: boolean }[]

  const missingSpouseEdges = useMemo(() => {
    if (!selectedMemberId) return []
    const myChildren = relationships
      .filter(r => r.type === 'parent_of' && r.from_id === selectedMemberId)
      .map(r => r.to_id)
    const coParents = myChildren.flatMap(childId =>
      relationships
        .filter(r => r.type === 'parent_of' && r.to_id === childId && r.from_id !== selectedMemberId)
        .map(r => r.from_id)
    )
    const uniqueCoParents = [...new Set(coParents)]
    return uniqueCoParents.filter(coParentId =>
      !relationships.some(r =>
        r.type === 'spouse_of' &&
        ((r.from_id === selectedMemberId && r.to_id === coParentId) ||
         (r.from_id === coParentId && r.to_id === selectedMemberId))
      )
    ).map(id => members.find(m => m.id === id)).filter(Boolean) as Member[]
  }, [selectedMemberId, members, relationships])

  async function linkAsSpouses(fromId: string, toId: string) {
    const { error } = await supabase
      .from('relationships')
      .insert({ tree_id: treeId, from_id: fromId, to_id: toId, type: 'spouse_of' })
    if (!error) {
      upsertRelationship({
        id: crypto.randomUUID(),
        tree_id: treeId,
        from_id: fromId,
        to_id: toId,
        type: 'spouse_of',
        created_at: new Date().toISOString(),
      })
      addToast('Connected as spouses', 'success')
    } else {
      addToast(error.message, 'error')
    }
  }

  // Relationship path to selected member from current user's node
  const relationshipPath = useMemo(() => {
    if (!showPath || !myMemberId || !selectedMemberId || myMemberId === selectedMemberId) return null
    return findRelationshipPath(myMemberId, selectedMemberId, members, relationships)
  }, [showPath, myMemberId, selectedMemberId, members, relationships])

  async function handleDelete() {
    if (!member) return
    setDeleting(true)
    removeMember(member.id)
    connections.forEach(({ rel }) => removeRelationship(rel.id))
    setSelectedMember(null)

    try {
      await supabase
        .from('relationships')
        .delete()
        .or(`from_id.eq.${member.id},to_id.eq.${member.id}`)
      await supabase.from('members').delete().eq('id', member.id)
      addToast(`${member.name} removed from tree`, 'info')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  async function handleEditSave(rel: Relationship, other: Member) {
    if (!member || !user) return
    setSavingEdit(true)

    try {
      if (editRelType === 'grandparent_of_selected') {
        // Grandparent needs two parent_of hops: member → intermediate → other.
        // Delete the direct relationship first, then create the intermediate node + two edges.
        const { data: intermediate, error: intErr } = await supabase
          .from('members')
          .insert({ tree_id: treeId, name: 'Unknown (Parent)', gender: 'other', is_living: true, created_by: user.id })
          .select()
          .single()
        if (intErr) throw intErr
        upsertMember(intermediate)

        const { error: delErr } = await supabase.from('relationships').delete().eq('id', rel.id)
        if (delErr) throw delErr
        removeRelationship(rel.id)

        const { data: rel1, error: rel1Err } = await supabase
          .from('relationships')
          .insert({ tree_id: treeId, from_id: member.id, to_id: intermediate.id, type: 'parent_of' })
          .select().single()
        if (rel1Err) throw rel1Err
        upsertRelationship(rel1)

        const { data: rel2, error: rel2Err } = await supabase
          .from('relationships')
          .insert({ tree_id: treeId, from_id: intermediate.id, to_id: other.id, type: 'parent_of' })
          .select().single()
        if (rel2Err) throw rel2Err
        upsertRelationship(rel2)

        addToast('Connection updated — edit "Unknown (Parent)" to fill in details', 'success')
        setEditingRelId(null)
        return
      }

      const newFromId = editRelType === 'child_of_selected' ? other.id : member.id
      const newToId = editRelType === 'child_of_selected' ? member.id : other.id
      const newType: RelationshipType =
        editRelType === 'parent_of_selected' || editRelType === 'child_of_selected'
          ? 'parent_of'
          : (editRelType as RelationshipType)
      const { data, error } = await supabase
        .from('relationships')
        .update({ from_id: newFromId, to_id: newToId, type: newType })
        .eq('id', rel.id)
        .select()
        .single()
      if (error) throw error
      if (data) upsertRelationship(data)
      addToast('Connection updated', 'success')
      setEditingRelId(null)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update connection', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleRemoveConnection(relId: string) {
    setRemovingRelId(relId)
    removeRelationship(relId)
    setConfirmRemoveRelId(null)
    try {
      const { error } = await supabase.from('relationships').delete().eq('id', relId)
      if (error) throw error
      addToast('Connection removed', 'info')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove connection', 'error')
    } finally {
      setRemovingRelId(null)
    }
  }

  const initials = member
    ? member.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : ''

  const desktopAnim = {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
  }
  const mobileAnim = {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
  }
  const anim = isMobile ? mobileAnim : desktopAnim

  function pathDescription(path: Member[]): string {
    if (path.length <= 1) return 'That\'s you'
    if (path.length === 2) return `Direct connection`
    if (path.length === 3) return `Related via ${path[1].name}`
    return `Related via ${path[1].name} and ${path.length - 3} other${path.length - 3 > 1 ? 's' : ''}`
  }

  return (
    <AnimatePresence>
      {selectedMemberId && member && (
        <>
          {isMobile && (
            <motion.div
              className="fixed inset-0 bg-black/50 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
            />
          )}

          <motion.div
            key={selectedMemberId}
            {...anim}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={
              isMobile
                ? 'fixed bottom-0 left-0 right-0 h-[72vh] bg-ft-bg2 rounded-t-3xl z-20 overflow-hidden flex flex-col'
                : 'absolute right-0 top-0 h-full w-80 bg-ft-bg2 border-l border-ft-border z-10 overflow-hidden flex flex-col'
            }
          >
            {isMobile && (
              <motion.div
                className="shrink-0 flex items-center justify-center h-8 cursor-grab active:cursor-grabbing"
                drag="y"
                dragConstraints={{ top: 0, bottom: 200 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 70) setSelectedMember(null)
                }}
              >
                <div className="w-10 h-1 rounded-full bg-ft-border2" />
              </motion.div>
            )}

            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-ft-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => navigate(`/tree/${treeId}/member/${member.id}`)}
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-ft-text shrink-0 hover:opacity-80 transition-opacity group/avatar"
                    style={!member.photo_url ? { background: sideGradient[side] } : undefined}
                    title="View profile"
                  >
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform"
                        onError={(e) => {
                          const t = e.currentTarget
                          t.style.display = 'none'
                          t.parentElement!.textContent = initials
                        }}
                      />
                    ) : initials}
                  </button>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-semibold text-ft-text truncate leading-tight">
                      {member.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${sideDot[side]}`} />
                      <span className="text-[11px] text-ft-text3 font-medium">{sideLabel[side]}</span>
                      {!member.is_living && (
                        <span className="text-[11px] text-ft-text3">· Deceased</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Action row */}
              <div className="mt-3">
                {confirmDelete ? (
                  <div className="bg-rose-950/30 border border-rose-800/30 rounded-xl p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle size={14} className="text-ft-rose mt-0.5 shrink-0" />
                      <p className="text-xs text-ft-text2 leading-relaxed">
                        Remove <strong className="text-ft-text">{member.name}</strong> and all their connections?
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-1.5 rounded-lg border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-colors hover:bg-rose-500/30"
                      >
                        {deleting ? 'Removing…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/tree/${treeId}/member/${member.id}`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 hover:border-ft-border2 transition-all"
                        title="View profile"
                      >
                        <User size={13} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => onEdit(member)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 hover:border-ft-border2 transition-all"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => onAddConnection(member)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-ft-border text-ft-text2 text-xs font-medium hover:bg-ft-bg4 hover:border-ft-border2 transition-all"
                        >
                          <Link2 size={13} />
                          Connect
                        </button>
                      )}
                      {canInvite && !member.user_id && (
                        <button
                          onClick={() => onInvite(member)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-ft-gold/30 text-ft-gold text-xs font-medium hover:bg-ft-gold/10 transition-all"
                          title="Invite to claim this node"
                        >
                          <UserPlus size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-800/30 text-rose-400 text-xs font-medium hover:bg-rose-950/30 transition-all"
                          title="Delete member"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => onAddRelative(member)}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs text-ft-text2 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
                      >
                        <UserPlus size={12} className="text-ft-v400" />
                        Add relative
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Info fields */}
              {(member.dob || member.occupation || member.location || member.bio) && (
                <div className="space-y-3">
                  {member.dob && (
                    <div className="flex items-center gap-2.5">
                      <CalendarDays size={14} className="text-ft-text3 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Born</p>
                        <p className="text-sm text-ft-text2 mt-0.5">
                          {new Date(member.dob).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {member.dod && (
                    <div className="flex items-center gap-2.5">
                      <CalendarDays size={14} className="text-ft-text3 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Passed</p>
                        <p className="text-sm text-ft-text2 mt-0.5">
                          {new Date(member.dod).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {member.occupation && (
                    <div className="flex items-center gap-2.5">
                      <Briefcase size={14} className="text-ft-text3 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Occupation</p>
                        <p className="text-sm text-ft-text2 mt-0.5">{member.occupation}</p>
                      </div>
                    </div>
                  )}
                  {member.location && (
                    <div className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-ft-text3 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">Location</p>
                        <p className="text-sm text-ft-text2 mt-0.5">{member.location}</p>
                      </div>
                    </div>
                  )}
                  {member.bio && (
                    <div className="pt-1">
                      <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium mb-1.5">About</p>
                      <p className="text-sm text-ft-text2 leading-relaxed">{member.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {/* How are we related? */}
              {myMemberId && selectedMemberId !== myMemberId && (
                <div>
                  <button
                    onClick={() => setShowPath((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-ft-v400 hover:text-ft-v200 transition-colors"
                  >
                    <GitBranch size={12} />
                    {showPath ? 'Hide' : 'How are we related?'}
                  </button>

                  <AnimatePresence>
                    {showPath && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        {relationshipPath ? (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              {relationshipPath.map((m, i) => (
                                <span key={m.id} className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedMember(m.id)}
                                    className="text-xs px-2 py-0.5 rounded-lg bg-ft-bg4 border border-ft-border text-ft-text2 hover:border-ft-border2 hover:text-ft-text transition-all truncate max-w-[80px]"
                                    title={m.name}
                                  >
                                    {m.id === myMemberId ? 'You' : m.name}
                                  </button>
                                  {i < relationshipPath.length - 1 && (
                                    <span className="text-ft-text3 text-xs">→</span>
                                  )}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] text-ft-text3">{pathDescription(relationshipPath)}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-ft-text3">No path found between these members.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Missing spouse suggestions */}
              {canEdit && missingSpouseEdges.length > 0 && (
                <div className="space-y-2">
                  {missingSpouseEdges.map(coParent => (
                    <div
                      key={coParent.id}
                      className="flex items-center gap-3 px-4 py-3 bg-ft-gold/10 border border-ft-gold/20 rounded-xl"
                    >
                      <span className="text-ft-gold text-xs flex-1 leading-relaxed">
                        {coParent.name} shares a child with {member?.name} — are they spouses?
                      </span>
                      <button
                        onClick={() => linkAsSpouses(selectedMemberId!, coParent.id)}
                        className="text-ft-gold font-semibold text-xs whitespace-nowrap hover:text-ft-text transition-colors"
                      >
                        Link as spouses
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Connections */}
              {connections.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium mb-2">
                    Connections · {connections.length}
                  </p>
                  <div className="space-y-1.5">
                    {connections.map(({ rel, other, isFrom }) => {
                      const label = relLabel[rel.type]?.(isFrom) ?? rel.type
                      const otherSide = sideMap[other.id] ?? 'unknown'
                      const isEditing = editingRelId === rel.id
                      const isConfirmingRemove = confirmRemoveRelId === rel.id

                      if (isEditing) {
                        return (
                          <div key={rel.id} className="px-3 py-2.5 bg-ft-bg4 border border-ft-border2 rounded-xl space-y-2">
                            <p className="text-xs text-ft-text2">
                              <span className="font-medium text-ft-text">{member.name}</span> is…
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {REL_UI_OPTIONS.map((opt) => (
                                <button
                                  key={opt.type}
                                  onClick={() => setEditRelType(opt.type)}
                                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium text-left transition-all border truncate ${
                                    editRelType === opt.type
                                      ? 'bg-ft-v500/20 border-ft-v500 text-ft-v200'
                                      : 'bg-ft-bg3 border-ft-border text-ft-text3 hover:border-ft-border2'
                                  }`}
                                >
                                  {opt.label} <span className="text-ft-text2">{other.name}</span>
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingRelId(null)}
                                className="flex-1 py-1 rounded-lg border border-ft-border text-ft-text2 text-xs hover:bg-ft-bg3 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditSave(rel, other)}
                                disabled={savingEdit}
                                className="flex-1 py-1 rounded-lg bg-ft-v500/20 border border-ft-v500/40 text-ft-v200 text-xs font-medium hover:bg-ft-v500/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                              >
                                {savingEdit ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                {savingEdit ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        )
                      }

                      if (isConfirmingRemove) {
                        return (
                          <div key={rel.id} className="px-3 py-2.5 bg-rose-950/20 border border-rose-800/30 rounded-xl space-y-2">
                            <p className="text-xs text-ft-text2">
                              Remove connection to <span className="font-medium text-ft-text">{other.name}</span>?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmRemoveRelId(null)}
                                className="flex-1 py-1 rounded-lg border border-ft-border text-ft-text2 text-xs hover:bg-ft-bg4 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleRemoveConnection(rel.id)}
                                disabled={removingRelId === rel.id}
                                className="flex-1 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                              >
                                {removingRelId === rel.id && <Loader2 size={11} className="animate-spin" />}
                                {removingRelId === rel.id ? 'Removing…' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={rel.id}
                          className="group flex items-center justify-between px-3 py-2 bg-ft-bg4 border border-ft-border rounded-xl hover:border-ft-border2 transition-all"
                        >
                          <button
                            onClick={() => setSelectedMember(other.id)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sideDot[otherSide]}`} />
                            <span className="text-xs text-ft-text2 font-medium truncate">{other.name}</span>
                            <span className="text-[10px] text-ft-text3 shrink-0">{label}</span>
                          </button>
                          {canEdit && (
                            <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => {
                                  setEditingRelId(rel.id)
                                  setEditRelType(getUIRelType(rel, member.id))
                                }}
                                className="p-1 rounded-md text-ft-text3 hover:text-ft-v400 hover:bg-ft-bg3 transition-colors"
                                title="Edit connection type"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => setConfirmRemoveRelId(rel.id)}
                                className="p-1 rounded-md text-ft-text3 hover:text-ft-rose hover:bg-rose-950/30 transition-colors"
                                title="Remove connection"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {connections.length === 0 && !member.dob && !member.occupation && !member.location && !member.bio && (
                <div className="text-center py-6">
                  <p className="text-sm text-ft-text3 mb-1">No connections yet.</p>
                  {canEdit && (
                    <button onClick={() => onAddConnection(member)} className="text-ft-v400 hover:text-ft-v200 transition-colors text-xs">
                      Add relationships to connect {member.name} to the family
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
