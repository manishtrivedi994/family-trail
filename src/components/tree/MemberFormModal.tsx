import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, ChevronDown, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useTreeStore } from '../../store/treeStore'
import { useToastStore } from '../../store/toastStore'
import { PhotoUpload } from '../ui/PhotoUpload'
import { deriveRelationships } from '../../lib/treeUtils'
import type { Member } from '../../types'

type Relation = 'Parent' | 'Grandparent' | 'Sibling' | 'Child' | 'Spouse' | 'Aunt/Uncle' | 'Cousin' | 'Other'

interface MemberFormModalProps {
  treeId: string
  ownerMemberId: string | null
  isFirstMember: boolean
  member?: Member | null
  initialAnchorMemberId?: string
  onClose: () => void
}

const inputClass = 'w-full bg-ft-bg4 border border-ft-border rounded-xl px-3.5 py-2.5 text-ft-text text-sm placeholder:text-ft-text3 focus:outline-none focus:border-ft-border3 transition-colors'
const labelClass = 'block text-[11px] uppercase tracking-widest text-ft-text3 font-medium mb-1.5'

export function MemberFormModal({ treeId, ownerMemberId, isFirstMember, member, initialAnchorMemberId, onClose }: MemberFormModalProps) {
  const user = useAuthStore((s) => s.user)
  const upsertMember = useTreeStore((s) => s.upsertMember)
  const removeMember = useTreeStore((s) => s.removeMember)
  const upsertRelationship = useTreeStore((s) => s.upsertRelationship)
  const storeMembers = useTreeStore((s) => s.members)
  const storeRelationships = useTreeStore((s) => s.relationships)
  const addToast = useToastStore((s) => s.addToast)

  const isEdit = !!member

  const [name, setName] = useState(member?.name ?? '')
  const [relation, setRelation] = useState<Relation>('Parent')
  const [grandparentTargetId, setGrandparentTargetId] = useState<string | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(member?.gender ?? 'other')
  const [dob, setDob] = useState(member?.dob ?? '')
  const [isLiving, setIsLiving] = useState(member?.is_living ?? true)
  const [dod, setDod] = useState(member?.dod ?? '')
  const [occupation, setOccupation] = useState(member?.occupation ?? '')
  const [location, setLocation] = useState(member?.location ?? '')
  const [bio, setBio] = useState(member?.bio ?? '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(member?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [anchorMemberId, setAnchorMemberId] = useState<string>(
    initialAnchorMemberId ?? ownerMemberId ?? ''
  )
  const [anchorSearch, setAnchorSearch] = useState('')
  const [showAnchorPicker, setShowAnchorPicker] = useState(false)

  const anchorMember = storeMembers.find(m => m.id === anchorMemberId) ?? null

  const anchorParents = useMemo(() => {
    if (!anchorMemberId) return []
    return storeRelationships
      .filter(r => r.type === 'parent_of' && r.to_id === anchorMemberId)
      .map(r => storeMembers.find(m => m.id === r.from_id))
      .filter(Boolean) as Member[]
  }, [storeRelationships, storeMembers, anchorMemberId])

  useEffect(() => {
    const t = setTimeout(() => { setGrandparentTargetId(null) }, 0)
    return () => clearTimeout(t)
  }, [relation, anchorMemberId])

  const relationOptions: { value: Relation; label: string }[] = [
    { value: 'Parent',      label: `Parent of ${anchorMember?.name ?? 'them'}` },
    { value: 'Child',       label: `Child of ${anchorMember?.name ?? 'them'}` },
    { value: 'Spouse',      label: `Spouse of ${anchorMember?.name ?? 'them'}` },
    { value: 'Sibling',     label: `Sibling of ${anchorMember?.name ?? 'them'}` },
    { value: 'Grandparent', label: `Grandparent of ${anchorMember?.name ?? 'them'}` },
    { value: 'Aunt/Uncle',  label: `Aunt/Uncle of ${anchorMember?.name ?? 'them'}` },
    { value: 'Other',       label: 'Other / connect manually' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (!user) return

    if (relation === 'Grandparent' && anchorParents.length >= 2 && !grandparentTargetId) {
      setError('Please select which parent this grandparent belongs to')
      return
    }

    setSaving(true)
    setError('')

    const fields = {
      name: name.trim(),
      gender,
      dob: dob || null,
      dod: (!isLiving && dod) ? dod : null,
      is_living: isLiving,
      occupation: occupation.trim() || null,
      location: location.trim() || null,
      bio: bio.trim() || null,
      photo_url: photoUrl,
    }

    if (isEdit && member) {
      const original = { ...member }
      const optimistic: Member = { ...member, ...fields }
      upsertMember(optimistic)

      try {
        const { error: updateErr } = await supabase
          .from('members')
          .update(fields)
          .eq('id', member.id)
        if (updateErr) throw updateErr
        addToast(`${fields.name} updated`, 'success')
        onClose()
      } catch (err) {
        upsertMember(original)
        const msg = err instanceof Error ? err.message : 'Update failed'
        setError(msg)
        addToast(msg, 'error')
        setSaving(false)
      }
      return
    }

    // Add mode
    try {
      const { data: newMember, error: memberErr } = await supabase
        .from('members')
        .insert({
          tree_id: treeId,
          ...fields,
          created_by: user.id,
          ...(isFirstMember ? { user_id: user.id } : {}),
        })
        .select()
        .single()

      if (memberErr) throw memberErr
      if (!newMember) throw new Error('No member returned')

      upsertMember(newMember)

      let ghostCreated = false
      let ghostNodeId: string | null = null

      if (!isFirstMember && anchorMemberId) {
        const effectiveRels = [...storeRelationships]

        // TASK: Ghost node intervention for multi-hop relatives with no parent stem
        if ((relation === 'Grandparent' || relation === 'Aunt/Uncle') && anchorParents.length === 0) {
          try {
            // 1. Create placeholder parent
            const { data: ghostNode, error: ghostErr } = await supabase
              .from('members')
              .insert({
                tree_id: treeId,
                name: 'Unknown (Parent)',
                gender: 'other',
                is_living: true,
                created_by: user.id,
              })
              .select().single()

            if (ghostErr) throw ghostErr
            if (ghostNode) {
              ghostNodeId = ghostNode.id
              upsertMember(ghostNode)
              // 2. Connect Ghost -> Anchor (so the anchor now has a parent)
              const { data: ghostEdge, error: edgeErr } = await supabase
                .from('relationships')
                .insert({
                  tree_id: treeId,
                  from_id: ghostNode.id,
                  to_id: anchorMemberId,
                  type: 'parent_of'
                })
                .select().single()

              if (edgeErr) throw edgeErr
              if (ghostEdge) {
                upsertRelationship(ghostEdge)
                effectiveRels.push(ghostEdge) // update array passed to deriveRelationships
                ghostCreated = true
              }
            }
          } catch (err) {
            console.warn('Failed to create auto-wire ghost parent:', err)
            // Fallback to original path if ghost fail
          }
        }

        const derived = deriveRelationships(
          newMember.id,
          anchorMemberId,
          relation,
          treeId,
          effectiveRels,
          grandparentTargetId ?? undefined
        )

        if (!derived.ok) {
          if (derived.reason === 'NEEDS_DISAMBIGUATION') {
            addToast('Please select which parent this grandparent belongs to', 'error')
          } else if (derived.reason === 'CYCLE') {
            const anchorMem = storeMembers.find(m => m.id === anchorMemberId)
            addToast(
              `Cannot add ${name} as ${relation} of ${anchorMem?.name ?? 'them'} — this would create a loop in the family tree.`,
              'error'
            )
          } else if (derived.reason === 'MAX_PARENTS_EXCEEDED') {
            const violatorName = storeMembers.find(m => m.id === derived.violatorId)?.name || 'A family member'
            addToast(
              `Cannot add connection — ${violatorName} already has 2 parents.`,
              'error'
            )
          }
          removeMember(newMember.id)
          await supabase.from('members').delete().eq('id', newMember.id)
          if (ghostNodeId) {
            removeMember(ghostNodeId)
            await supabase.from('members').delete().eq('id', ghostNodeId)
          }
          setSaving(false)
          return
        }

        if (derived.relationships.length > 0) {
          const { data: insertedRels, error: relErr } = await supabase
            .from('relationships')
            .insert(derived.relationships)
            .select()

          if (relErr) {
            addToast(`${newMember.name} added, but some connections couldn't be saved`, 'error')
          } else if (insertedRels) {
            insertedRels.forEach(r => upsertRelationship(r))
          }
        }

        if (ghostCreated) {
          addToast(`${newMember.name} added — edit "Unknown (Parent)" to fill details`, 'success')
        } else if (relation === 'Grandparent' && anchorParents.length === 0) {
          addToast(`${newMember.name} added — add a parent first to connect them properly`, 'info')
        } else {
          const count = derived.relationships.length
          addToast(
            count > 0
              ? `${newMember.name} added — ${count} connection${count > 1 ? 's' : ''} auto-wired`
              : `${newMember.name} added to the tree`,
            'success'
          )
        }
      } else {
        addToast(`${newMember.name} added to the tree`, 'success')
      }

      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      addToast(msg, 'error')
      setSaving(false)
    }
  }

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
          className="relative w-full max-w-md bg-ft-bg2 border border-ft-border2 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ft-border shrink-0">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ft-text">
                {isEdit ? `Edit ${member.name}` : (isFirstMember ? 'Add yourself first' : 'Add a family member')}
              </h2>
              {isFirstMember && !isEdit && (
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

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Photo upload (edit mode only) */}
              {isEdit && member && user && (
                <div className="p-3 bg-ft-bg4/50 rounded-xl border border-ft-border">
                  <PhotoUpload
                    currentPhotoUrl={photoUrl}
                    memberId={member.id}
                    userId={user.id}
                    name={name || member.name}
                    onUploadComplete={(url) => setPhotoUrl(url)}
                  />
                </div>
              )}

              {/* Name */}
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

              {/* Anchor + Relation (add mode only) */}
              {!isEdit && !isFirstMember && (
                <>
                  {/* Anchor person selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-widest text-ft-text3 font-medium">
                      Adding relative of
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowAnchorPicker((v) => !v)}
                      className="w-full flex items-center gap-3 bg-ft-bg3 border border-ft-border2 rounded-xl px-3 py-2.5 text-left hover:border-ft-border3 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {anchorMember?.name?.[0] ?? '?'}
                      </div>
                      <span className="flex-1 text-sm font-medium text-ft-text">
                        {anchorMember?.name ?? 'Select a person'}
                      </span>
                      {anchorMemberId === ownerMemberId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ft-v500/20 text-ft-v200 border border-ft-v500/30">
                          You
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        className={`text-ft-text3 transition-transform ${showAnchorPicker ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showAnchorPicker && (
                      <div className="bg-ft-bg2 border border-ft-border2 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-2 border-b border-ft-border">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search family members..."
                            value={anchorSearch}
                            onChange={(e) => setAnchorSearch(e.target.value)}
                            className="w-full bg-ft-bg3 border border-ft-border rounded-lg px-3 py-2 text-sm text-ft-text placeholder:text-ft-text3 focus:outline-none focus:border-ft-v400 transition-colors"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {storeMembers
                            .filter(m => m.name.toLowerCase().includes(anchorSearch.toLowerCase()))
                            .map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setAnchorMemberId(m.id)
                                  setRelation('Parent')
                                  setShowAnchorPicker(false)
                                  setAnchorSearch('')
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-ft-border transition-colors text-sm ${
                                  anchorMemberId === m.id ? 'bg-ft-v500/10 text-ft-v200' : 'text-ft-text'
                                }`}
                              >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ft-v600 to-ft-v500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {m.name[0]}
                                </div>
                                <span className="flex-1">{m.name}</span>
                                {m.id === ownerMemberId && (
                                  <span className="text-[10px] text-ft-text3">You</span>
                                )}
                                {anchorMemberId === m.id && (
                                  <Check size={14} className="text-ft-v400 shrink-0" />
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Relation */}
                  <div>
                    <label className={labelClass}>
                      {anchorMemberId === ownerMemberId
                        ? 'Their relation to you'
                        : `Their relation to ${anchorMember?.name ?? 'them'}`}
                    </label>
                    <select
                      value={relation}
                      onChange={(e) => setRelation(e.target.value as Relation)}
                      className={inputClass}
                    >
                      {relationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Grandparent disambiguation — shown only when anchor has 2+ parents */}
                  {relation === 'Grandparent' && anchorParents.length >= 2 && (
                    <div>
                      <label className={labelClass}>Parent of which parent?</label>
                      <div className="flex gap-2">
                        {anchorParents.map(parent => (
                          <button
                            key={parent.id}
                            type="button"
                            onClick={() => setGrandparentTargetId(parent.id)}
                            className={`flex-1 rounded-xl px-3 py-2.5 border text-sm font-medium transition-all ${
                              grandparentTargetId === parent.id
                                ? 'border-ft-v400 bg-ft-v500/20 text-ft-v200'
                                : 'border-ft-border text-ft-text2 bg-ft-bg3 hover:border-ft-border2'
                            }`}
                          >
                            {parent.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Gender */}
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

              {/* DOB + Deceased toggle */}
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
                      : 'bg-ft-rose/10 border-ft-rose/30 text-ft-rose'
                      }`}
                  >
                    {isLiving ? 'Living' : 'Deceased'}
                  </button>
                </div>
              </div>

              {/* Date of death (deceased only) */}
              {!isLiving && (
                <div>
                  <label className={labelClass}>Date of death</label>
                  <input
                    type="date"
                    value={dod}
                    onChange={(e) => setDod(e.target.value)}
                    className={inputClass}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              )}

              {/* Occupation */}
              <div>
                <label className={labelClass}>Occupation</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Engineer, Teacher…"
                  className={inputClass}
                />
              </div>

              {/* Location */}
              <div>
                <label className={labelClass}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai, India"
                  className={inputClass}
                />
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass.replace('mb-1.5', '')}>Bio</label>
                  <span className={`text-[10px] ${bio.length > 270 ? 'text-ft-rose' : 'text-ft-text3'}`}>
                    {bio.length}/300
                  </span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  placeholder="A few words about this person…"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && (
                <p className="text-ft-rose text-xs">{error}</p>
              )}

              <div className="flex gap-3 pt-1 pb-1">
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
                  {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add to tree')}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
