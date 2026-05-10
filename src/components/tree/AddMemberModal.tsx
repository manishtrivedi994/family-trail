import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { RelationshipType } from '../../types'

type Relation = 'Parent' | 'Grandparent' | 'Sibling' | 'Child' | 'Spouse' | 'Aunt/Uncle' | 'Cousin' | 'Other'

const RELATIONS: Relation[] = ['Parent', 'Grandparent', 'Sibling', 'Child', 'Spouse', 'Aunt/Uncle', 'Cousin', 'Other']

function deriveRelationship(
  relation: Relation,
  newMemberId: string,
  ownerMemberId: string
): { from_id: string; to_id: string; type: RelationshipType } | null {
  switch (relation) {
    case 'Parent':
      return { from_id: newMemberId, to_id: ownerMemberId, type: 'parent_of' }
    case 'Child':
      return { from_id: ownerMemberId, to_id: newMemberId, type: 'parent_of' }
    case 'Spouse':
      return { from_id: ownerMemberId, to_id: newMemberId, type: 'spouse_of' }
    case 'Sibling':
      return { from_id: ownerMemberId, to_id: newMemberId, type: 'sibling_of' }
    default:
      return null
  }
}

interface AddMemberModalProps {
  treeId: string
  ownerMemberId: string | null
  isFirstMember: boolean
  onClose: () => void
}

export function AddMemberModal({ treeId, ownerMemberId, isFirstMember, onClose }: AddMemberModalProps) {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [relation, setRelation] = useState<Relation>('Parent')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other')
  const [dob, setDob] = useState('')
  const [isLiving, setIsLiving] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (!user) return
    setSaving(true)
    setError('')

    try {
      const { data: newMember, error: memberErr } = await supabase
        .from('members')
        .insert({
          tree_id: treeId,
          name: name.trim(),
          gender,
          dob: dob || null,
          is_living: isLiving,
          created_by: user.id,
          ...(isFirstMember ? { user_id: user.id } : {}),
        })
        .select()
        .single()

      if (memberErr) throw memberErr

      if (!isFirstMember && ownerMemberId && newMember) {
        if (relation === 'Grandparent') {
          // Grandparent needs two parent_of hops: grandparent → intermediate parent → owner.
          // Create an anonymous intermediate parent node so Dagre places the grandparent
          // two levels above in the tree rather than one.
          const { data: intermediateMember, error: intErr } = await supabase
            .from('members')
            .insert({
              tree_id: treeId,
              name: 'Unknown (Parent)',
              gender: 'other',
              is_living: true,
              created_by: user.id,
            })
            .select()
            .single()
          if (intErr) throw intErr

          const { error: rel1Err } = await supabase
            .from('relationships')
            .insert({ tree_id: treeId, from_id: newMember.id, to_id: intermediateMember.id, type: 'parent_of' })
          if (rel1Err) throw rel1Err

          const { error: rel2Err } = await supabase
            .from('relationships')
            .insert({ tree_id: treeId, from_id: intermediateMember.id, to_id: ownerMemberId, type: 'parent_of' })
          if (rel2Err) throw rel2Err
        } else {
          const rel = deriveRelationship(relation, newMember.id, ownerMemberId)
          if (rel) {
            const { error: relErr } = await supabase
              .from('relationships')
              .insert({ tree_id: treeId, ...rel })
            if (relErr) throw relErr
          }
        }
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-ft-bg4 border border-ft-border rounded-xl px-3.5 py-2.5 text-ft-text text-sm placeholder:text-ft-text3 focus:outline-none focus:border-ft-border3 transition-colors'
  const labelClass = 'block text-[11px] uppercase tracking-widest text-ft-text3 font-medium mb-1.5'

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
          className="relative w-full max-w-md bg-ft-bg2 border border-ft-border2 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ft-border">
            <div>
              <h2 className="font-display text-lg font-semibold text-ft-text">
                {isFirstMember ? 'Add yourself first' : 'Add a family member'}
              </h2>
              {isFirstMember && (
                <p className="text-xs text-ft-text3 mt-0.5">Your node anchors the whole tree</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Full name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Trivedi"
                className={inputClass}
                autoFocus
              />
            </div>

            {!isFirstMember && (
              <div>
                <label className={labelClass}>Relation to you</label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value as Relation)}
                  className={inputClass}
                >
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Gender</label>
              <div className="flex gap-2">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all border ${gender === g
                        ? 'bg-ft-v500/20 border-ft-v500 text-ft-v200'
                        : 'bg-ft-bg4 border-ft-border text-ft-text3 hover:border-ft-border2'
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <button
                  type="button"
                  onClick={() => setIsLiving(!isLiving)}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border ${isLiving
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                      : 'bg-ft-bg4 border-ft-border text-ft-text3'
                    }`}
                >
                  {isLiving ? 'Living' : 'Deceased'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-rose-400 text-xs">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-ft-border text-ft-text2 text-sm font-medium hover:bg-ft-bg4 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-ft-v500 to-ft-v400 text-white text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(124,92,255,0.4)] transition-all disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Adding…' : 'Add to tree'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
