# Family Trail — Auto-Connection Logic Patch

## Project status
All 8 sessions are complete. The app is fully built and live. This is a targeted patch session to fix a specific gap in the member addition flow.

## What's already built
- React + TypeScript + Vite PWA
- Tailwind CSS with `ft-*` design tokens (dark jewel-tone theme, Cormorant Garamond + Inter)
- Supabase backend — `trees`, `members`, `relationships`, `invites`, `tree_members` tables with RLS
- React Flow tree canvas with Dagre layout and side-aware node colours (violet = owner side, teal = spouse side, gold = children)
- `treeStore` (Zustand + immer) with `members`, `relationships`, `selectedMemberId`, `myRole`
- `useTree` hook with Supabase Realtime subscription
- `MemberFormModal` — add + edit member form with fields: name, relation, gender, dob, is_living, occupation, location, bio, photo
- `treeUtils.ts` — `buildFlowGraph()` for Dagre layout and side detection
- `RelationshipsPanel` — manual add/remove connections between existing members
- `MemberSidebar` — right panel / mobile bottom sheet on node click
- Full invite/claim/collaborate flow, photo uploads, PWA, offline mode, GA4, settings

## The problem to fix

When a user adds a new member via `MemberFormModal`, the current submit handler only creates **one** relationship — between the new member and the owner. It does not traverse the existing graph to auto-wire logically implied connections.

**Examples of what should happen but currently doesn't:**

- User adds "Grandparent" but already has a Parent → grandparent should be auto-wired as `parent_of` the existing parent node, not just loosely connected to the owner
- User adds "Brother" but already has both parents → brother should be auto-wired as `parent_of` by both parent nodes, and `sibling_of` any other existing siblings
- User adds "Child" and already has a Spouse → spouse should be auto-wired as co-`parent_of` the new child
- User adds "Aunt" → she should be auto-wired as `sibling_of` the relevant parent

---

## What to build

### 1. `deriveRelationships()` in `src/lib/treeUtils.ts`

Add this pure function. It takes what's already in the graph and derives all relationship edges that logically follow from the user's stated relation.

```ts
import type { Member, Relationship, RelationshipType } from '../types'

interface NewRelationship {
  tree_id: string
  from_id: string
  to_id: string
  type: RelationshipType
}

export function deriveRelationships(
  newMemberId: string,
  ownerId: string,
  relation: 'Parent' | 'Grandparent' | 'Sibling' | 'Child' | 'Spouse' | 'Aunt/Uncle' | 'Cousin' | 'Other',
  treeId: string,
  members: Member[],
  relationships: Relationship[],
  grandparentTargetParentId?: string  // disambiguation: which parent this grandparent belongs to
): NewRelationship[] | 'NEEDS_DISAMBIGUATION' {
  const result: NewRelationship[] = []

  // ── Helpers ──────────────────────────────────────────────────────────────

  function parentsOf(personId: string): string[] {
    return relationships
      .filter(r => r.type === 'parent_of' && r.to_id === personId)
      .map(r => r.from_id)
  }

  function childrenOf(personId: string): string[] {
    return relationships
      .filter(r => r.type === 'parent_of' && r.from_id === personId)
      .map(r => r.to_id)
  }

  function siblingsOf(personId: string): string[] {
    return relationships
      .filter(r => r.type === 'sibling_of' && (r.from_id === personId || r.to_id === personId))
      .map(r => r.from_id === personId ? r.to_id : r.from_id)
  }

  function spousesOf(personId: string): string[] {
    return relationships
      .filter(r => r.type === 'spouse_of' && (r.from_id === personId || r.to_id === personId))
      .map(r => r.from_id === personId ? r.to_id : r.from_id)
  }

  function addRel(from_id: string, to_id: string, type: RelationshipType) {
    if (from_id === to_id) return
    const duplicate = relationships.some(
      r => r.from_id === from_id && r.to_id === to_id && r.type === type
    ) || result.some(
      r => r.from_id === from_id && r.to_id === to_id && r.type === type
    )
    if (!duplicate) result.push({ tree_id: treeId, from_id, to_id, type })
  }

  // ── Relation logic ────────────────────────────────────────────────────────

  switch (relation) {

    case 'Parent': {
      // New member is parent of owner
      addRel(newMemberId, ownerId, 'parent_of')
      // Also parent of owner's existing siblings
      siblingsOf(ownerId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))
      break
    }

    case 'Grandparent': {
      const ownerParents = parentsOf(ownerId)

      if (ownerParents.length === 0) {
        // No parents in tree yet — connect directly to owner and show a warning toast
        addRel(newMemberId, ownerId, 'parent_of')
      } else if (ownerParents.length === 1) {
        const parentId = ownerParents[0]
        addRel(newMemberId, parentId, 'parent_of')
        // Also wire as parent of parent's siblings (owner's aunts/uncles)
        siblingsOf(parentId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))
      } else {
        // 2+ parents — need user to pick which one
        if (!grandparentTargetParentId) return 'NEEDS_DISAMBIGUATION'
        addRel(newMemberId, grandparentTargetParentId, 'parent_of')
        siblingsOf(grandparentTargetParentId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))
      }
      break
    }

    case 'Sibling': {
      // Sibling_of owner
      addRel(ownerId, newMemberId, 'sibling_of')
      // Owner's parents are also parents of the new sibling
      parentsOf(ownerId).forEach(parentId => addRel(parentId, newMemberId, 'parent_of'))
      // Sibling_of owner's other siblings too
      siblingsOf(ownerId).forEach(sibId => addRel(sibId, newMemberId, 'sibling_of'))
      break
    }

    case 'Child': {
      // Owner is parent of new member
      addRel(ownerId, newMemberId, 'parent_of')
      // Spouse is also a parent
      spousesOf(ownerId).forEach(spouseId => addRel(spouseId, newMemberId, 'parent_of'))
      // New member is sibling of existing children
      childrenOf(ownerId).forEach(childId => addRel(childId, newMemberId, 'sibling_of'))
      break
    }

    case 'Spouse': {
      addRel(ownerId, newMemberId, 'spouse_of')
      // Spouse co-parents owner's existing children
      childrenOf(ownerId).forEach(childId => addRel(newMemberId, childId, 'parent_of'))
      break
    }

    case 'Aunt/Uncle': {
      // Sibling of one of owner's parents
      parentsOf(ownerId).forEach(parentId => addRel(parentId, newMemberId, 'sibling_of'))
      break
    }

    case 'Cousin':
    case 'Other': {
      // No safe auto-wiring — user can wire manually via RelationshipsPanel
      // Still need at least one edge so the node appears on the canvas
      addRel(ownerId, newMemberId, 'sibling_of')
      break
    }
  }

  return result
}
```

---

### 2. Update `MemberFormModal.tsx`

#### 2a. Grandparent disambiguation UI

Inside the form, after the relation select, conditionally render a parent picker when:
- Selected relation is `'Grandparent'`
- Owner already has 2+ parents in the tree

```tsx
// At the top of the component, derive owner's existing parents:
const ownerParents = useMemo(() => {
  return relationships
    .filter(r => r.type === 'parent_of' && r.to_id === ownerMemberId)
    .map(r => members.find(m => m.id === r.from_id))
    .filter(Boolean) as Member[]
}, [relationships, members, ownerMemberId])

// State:
const [grandparentTargetId, setGrandparentTargetId] = useState<string | null>(null)

// Reset when relation changes:
useEffect(() => { setGrandparentTargetId(null) }, [selectedRelation])

// In JSX, after the relation select field:
{selectedRelation === 'Grandparent' && ownerParents.length >= 2 && (
  <div className="space-y-2">
    <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
      Parent of which parent?
    </label>
    <div className="flex gap-2">
      {ownerParents.map(parent => (
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
```

#### 2b. Updated submit handler

Replace the current relationship insertion logic entirely:

```ts
async function handleSubmit() {
  // Validate grandparent disambiguation
  if (selectedRelation === 'Grandparent' && ownerParents.length >= 2 && !grandparentTargetId) {
    addToast('Please select which parent this grandparent belongs to', 'error')
    return
  }

  setSubmitting(true)

  try {
    // 1. Insert the new member
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        tree_id: treeId,
        name: name.trim(),
        gender: gender || null,
        dob: dob || null,
        is_living: isLiving,
        occupation: occupation.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (memberError || !newMember) throw memberError

    // Optimistic update
    treeStore.upsertMember(newMember)

    // 2. Derive all relationships
    const derived = deriveRelationships(
      newMember.id,
      ownerMemberId,
      selectedRelation,
      treeId,
      treeStore.members,      // use store state — includes the new member
      treeStore.relationships,
      grandparentTargetId ?? undefined
    )

    // Handle edge case: NEEDS_DISAMBIGUATION (shouldn't reach here due to validation above)
    if (derived === 'NEEDS_DISAMBIGUATION') {
      addToast('Please select which parent this grandparent belongs to', 'error')
      return
    }

    // 3. Batch insert all derived relationships
    if (derived.length > 0) {
      const { error: relError } = await supabase
        .from('relationships')
        .insert(derived)

      if (relError) {
        // Non-fatal — member was added, just connections failed
        addToast(`${newMember.name} added, but some connections couldn't be saved`, 'error')
      } else {
        // Optimistically update the store
        derived.forEach(r =>
          treeStore.upsertRelationship({
            ...r,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          })
        )
      }
    }

    // 4. Warn if grandparent was added without existing parents
    if (selectedRelation === 'Grandparent' && ownerParents.length === 0) {
      addToast(
        `${newMember.name} added. Add a parent first to connect them properly.`,
        'info'
      )
    } else {
      const count = derived === 'NEEDS_DISAMBIGUATION' ? 0 : derived.length
      addToast(
        count > 0
          ? `${newMember.name} added — ${count} connection${count > 1 ? 's' : ''} auto-wired`
          : `${newMember.name} added`,
        'success'
      )
    }

    closeModal()

  } catch (err) {
    console.error(err)
    addToast('Failed to add member', 'error')
  } finally {
    setSubmitting(false)
  }
}
```

---

### 3. Minor: ownerMemberId in context

`deriveRelationships` needs `ownerMemberId` — the member node in this tree that belongs to the logged-in user. This should already exist in `treeStore` from Session 3. If it doesn't, derive it like this wherever needed:

```ts
const ownerMemberId = useMemo(() =>
  members.find(m => m.user_id === authStore.user?.id)?.id ?? null,
  [members]
)
```

If `ownerMemberId` is null (the logged-in user hasn't claimed a node yet), disable the relation picker and show a message: "Claim your node first to enable smart connections."

---

### 4. toastStore — add `'info'` type if not already present

The `addToast` call above uses type `'info'`. Make sure the toast store and `ToastContainer` handle it:

```ts
// toastStore.ts — add 'info' to the union if missing:
type ToastType = 'success' | 'error' | 'info'

// ToastContainer.tsx — info toast styling:
// border-l-2 border-ft-v400  (violet left border, matching the app's primary colour)
```

---

## Testing checklist

Run through each scenario manually after applying the patch:

- [ ] **Add grandparent, no parents exist** → node appears, toast warns "Add a parent first", 1 loose connection to owner
- [ ] **Add grandparent, 1 parent exists** → grandparent auto-wired as parent of your parent. Canvas updates without manual wiring.
- [ ] **Add grandparent, 2 parents exist** → disambiguation picker appears in form. Selecting a parent wires correctly. Submit without picking → validation error.
- [ ] **Add sibling, no parents** → sibling_of owner only
- [ ] **Add sibling, 1 parent exists** → sibling_of owner + parent_of by that parent
- [ ] **Add sibling, 2 parents exist** → sibling_of owner + parent_of by both parents + sibling_of any existing siblings
- [ ] **Add child, no spouse** → parent_of by owner only
- [ ] **Add child, spouse exists** → parent_of by owner AND spouse, sibling_of any existing children
- [ ] **Add spouse** → spouse_of owner + co-parent of existing children
- [ ] **Add aunt/uncle** → sibling_of your parent(s)
- [ ] **Add second grandparent on same side** → both grandparents become parents of the same parent. Canvas shows 2 grandparent nodes both connecting to 1 parent node. ✓
- [ ] **Realtime: another contributor adds a member** → their additions don't trigger `deriveRelationships` (that's client-side only for the person adding). Realtime just syncs the raw member + relationships they inserted. ✓ (no change needed)
- [ ] **Duplicate edge guard** → adding the same relation twice doesn't create duplicate edges in the DB or the store

## Files changed

- `src/lib/treeUtils.ts` — add `deriveRelationships()`
- `src/components/tree/MemberFormModal.tsx` — disambiguation UI + updated submit handler
- `src/store/toastStore.ts` — add `'info'` type (if missing)
- `src/components/ui/ToastContainer.tsx` — add info toast style (if missing)
