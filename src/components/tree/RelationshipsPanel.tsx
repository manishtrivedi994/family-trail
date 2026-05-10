import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Trash2, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTreeStore } from '../../store/treeStore'
import { useToastStore } from '../../store/toastStore'
import { wouldCreateCycle, describeCycleError } from '../../lib/treeUtils'
import type { Member, RelationshipType } from '../../types'

type UIRelType = 'parent_of_selected' | 'child_of_selected' | 'spouse_of' | 'sibling_of'

const UI_REL_LABELS: Record<UIRelType, string> = {
  parent_of_selected: 'is Parent of',
  child_of_selected: 'is Child of',
  spouse_of: 'is Spouse of',
  sibling_of: 'is Sibling of',
}

function toDBRelationship(
  uiType: UIRelType,
  currentId: string,
  selectedId: string
): { from_id: string; to_id: string; type: RelationshipType } {
  switch (uiType) {
    case 'parent_of_selected':
      return { from_id: currentId, to_id: selectedId, type: 'parent_of' }
    case 'child_of_selected':
      return { from_id: selectedId, to_id: currentId, type: 'parent_of' }
    case 'spouse_of':
      return { from_id: currentId, to_id: selectedId, type: 'spouse_of' }
    case 'sibling_of':
      return { from_id: currentId, to_id: selectedId, type: 'sibling_of' }
  }
}

const relDisplayLabel: Record<RelationshipType, (isFrom: boolean) => string> = {
  parent_of: (isFrom) => (isFrom ? 'Parent of' : 'Child of'),
  spouse_of: () => 'Spouse of',
  sibling_of: () => 'Sibling of',
}

interface RelationshipsPanelProps {
  member: Member
  onClose: () => void
}

export function RelationshipsPanel({ member, onClose }: RelationshipsPanelProps) {
  const tree = useTreeStore((s) => s.tree)
  const members = useTreeStore((s) => s.members)
  const relationships = useTreeStore((s) => s.relationships)
  const upsertRelationship = useTreeStore((s) => s.upsertRelationship)
  const removeRelationship = useTreeStore((s) => s.removeRelationship)
  const addToast = useToastStore((s) => s.addToast)

  const [search, setSearch] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<Member | null>(null)
  const [relType, setRelType] = useState<UIRelType>('parent_of_selected')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const candidates = useMemo(() =>
    members.filter((m) =>
      m.id !== member.id &&
      m.name.toLowerCase().includes(search.toLowerCase())
    ),
    [members, member.id, search]
  )

  const existingConnections = useMemo(() =>
    relationships
      .filter((r) => r.from_id === member.id || r.to_id === member.id)
      .map((r) => {
        const isFrom = r.from_id === member.id
        const otherId = isFrom ? r.to_id : r.from_id
        const other = members.find((m) => m.id === otherId)
        return other ? { rel: r, other, isFrom } : null
      })
      .filter(Boolean) as { rel: typeof relationships[0]; other: Member; isFrom: boolean }[],
    [relationships, member.id, members]
  )

  async function handleAdd() {
    if (!selectedTarget || !tree) return

    const { from_id, to_id, type } = toDBRelationship(relType, member.id, selectedTarget.id)

    if (type === 'parent_of' && wouldCreateCycle(from_id, to_id, relationships)) {
      const parentName = relType === 'parent_of_selected' ? member.name : selectedTarget.name
      const childName  = relType === 'parent_of_selected' ? selectedTarget.name : member.name
      addToast(describeCycleError(parentName, childName, 'parent'), 'error')
      return
    }

    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('relationships')
        .insert({ tree_id: tree.id, from_id, to_id, type })
        .select()
        .single()
      if (error) throw error
      if (data) upsertRelationship(data)
      addToast(`Connected ${member.name} ↔ ${selectedTarget.name}`, 'success')
      setSelectedTarget(null)
      setSearch('')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add connection', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(relId: string) {
    setRemovingId(relId)
    removeRelationship(relId)

    try {
      const { error } = await supabase.from('relationships').delete().eq('id', relId)
      if (error) throw error
      addToast('Connection removed', 'info')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove connection', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  const inputClass = 'w-full bg-ft-bg4 border border-ft-border rounded-xl px-3.5 py-2.5 text-ft-text text-sm placeholder:text-ft-text3 focus:outline-none focus:border-ft-border3 transition-colors'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-md bg-ft-bg2 border border-ft-border2 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ft-border shrink-0">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ft-text">
                Connect {member.name}
              </h2>
              <p className="text-xs text-ft-text3 mt-0.5">Add or remove family connections</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Add connection form */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-widest text-ft-text3 font-medium">
                Add connection
              </p>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedTarget(null) }}
                  placeholder="Search members by name…"
                  className={`${inputClass} pl-9`}
                />
              </div>

              {/* Member list */}
              {search && (
                <div className="bg-ft-bg3 border border-ft-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <p className="text-sm text-ft-text3 text-center py-3">No members found</p>
                  ) : (
                    candidates.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedTarget(c); setSearch(c.name) }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors border-b border-ft-border last:border-0 ${
                          selectedTarget?.id === c.id
                            ? 'bg-ft-v500/15 text-ft-v200'
                            : 'text-ft-text2 hover:bg-ft-bg4'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Relationship type */}
              {selectedTarget && (
                <div className="space-y-2">
                  <p className="text-[11px] text-ft-text3 font-medium">
                    <span className="text-ft-text">{member.name}</span>…
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(UI_REL_LABELS) as [UIRelType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRelType(type)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium text-left transition-all border ${
                          relType === type
                            ? 'bg-ft-v500/20 border-ft-v500 text-ft-v200'
                            : 'bg-ft-bg4 border-ft-border text-ft-text3 hover:border-ft-border2'
                        }`}
                      >
                        {label} <span className="text-ft-text2">{selectedTarget.name}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleAdd}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-br from-ft-v500 to-ft-v400 text-white text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(124,92,255,0.4)] transition-all disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? 'Adding…' : 'Add connection'}
                  </button>
                </div>
              )}
            </div>

            {/* Existing connections */}
            {existingConnections.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-ft-text3 font-medium">
                  Existing connections
                </p>
                <div className="space-y-1.5">
                  {existingConnections.map(({ rel, other, isFrom }) => {
                    const label = relDisplayLabel[rel.type]?.(isFrom) ?? rel.type
                    return (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-ft-bg3 border border-ft-border rounded-xl"
                      >
                        <div className="min-w-0">
                          <span className="text-xs text-ft-text3">{label} </span>
                          <span className="text-sm text-ft-text2 font-medium truncate">{other.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemove(rel.id)}
                          disabled={removingId === rel.id}
                          className="ml-3 p-1.5 rounded-lg text-ft-text3 hover:text-ft-rose hover:bg-rose-950/30 transition-colors shrink-0"
                        >
                          {removingId === rel.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
