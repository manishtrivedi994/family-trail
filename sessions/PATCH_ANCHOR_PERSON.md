# Family Trail — Patch: Add member relative to any existing person

## Project status
All 8 sessions complete. Auto-connect patch and spouse_of patch both applied.

## The problem

The current "Add member" flow asks "relation to me (the owner)" — which works fine
for parents, siblings, children, spouse. But it breaks for anyone further out:

- To add a great-grandparent, the user has to add them as "Other", then manually
  wire them to the grandparent via RelationshipsPanel, then remove the loose
  connection to the owner. That's 3 extra steps.
- Same problem for: spouse's parents, grandparent's siblings, second cousins, etc.

The root issue: **"relation to me" is the wrong anchor point** for extended family.
The right model is: **"who are they related to, and how?"** — where "who" can be
any existing member in the tree, not just the owner.

---

## The solution — two-step Add Member flow

### Step 1 — Pick the anchor person
"Who are you adding this person relative to?"
- Default: the owner (current behaviour, unchanged for close family)
- Or: search and select any existing member in the tree

### Step 2 — Pick the relation
"How are they related to [selected person]?"
- The relation options shown depend on who the anchor is
- The relation is always stated from the anchor's perspective:
  "Parent of Ramesh", "Child of Ramesh", "Spouse of Ramesh", "Sibling of Ramesh"

`deriveRelationships()` already takes `ownerId` as the anchor — rename it to
`anchorId` and it works for any person in the tree, not just the owner.

---

## Changes required

### 1. `src/lib/treeUtils.ts` — rename `ownerId` → `anchorId`

In `deriveRelationships()`, rename the parameter `ownerId` to `anchorId`
throughout. No logic changes needed — the function already works generically,
it just assumed the anchor was always the owner.

```ts
export function deriveRelationships(
  newMemberId: string,
  anchorId: string,          // ← was ownerId — now any member in the tree
  relation: RelationOption,
  treeId: string,
  members: Member[],
  relationships: Relationship[],
  grandparentTargetParentId?: string
): NewRelationship[] | 'NEEDS_DISAMBIGUATION' {
```

All internal references to `ownerId` → `anchorId`. No other logic changes.

Also update the disambiguation check — it was checking grandparent with 2+
parents of the *owner*. Now it should check 2+ parents of the *anchor*:

```ts
// was: parentsOf(ownerId).length >= 2
// now: parentsOf(anchorId).length >= 2
```

---

### 2. `src/components/tree/MemberFormModal.tsx` — two-step UI

#### State additions

```ts
const [anchorMemberId, setAnchorMemberId] = useState<string>(ownerMemberId)
const [anchorSearch, setAnchorSearch] = useState('')
const [showAnchorPicker, setShowAnchorPicker] = useState(false)
```

`anchorMemberId` defaults to `ownerMemberId` (owner) — preserving existing
behaviour when the user doesn't change it.

#### Anchor picker UI

Add this above the relation select field:

```tsx
{/* Anchor person selector */}
<div className="space-y-2">
  <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
    Adding relative of
  </label>

  {/* Selected anchor display */}
  <button
    type="button"
    onClick={() => setShowAnchorPicker(true)}
    className="w-full flex items-center gap-3 bg-ft-bg3 border border-ft-border2
               rounded-xl px-3 py-2.5 text-left hover:border-ft-border3 transition-colors"
  >
    {/* Avatar circle of anchor member */}
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400
                    flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
      {anchorMember?.name?.[0] ?? '?'}
    </div>
    <span className="flex-1 text-sm font-medium text-ft-text">
      {anchorMember?.name ?? 'Select a person'}
    </span>
    {/* Show "You" badge if anchor is the owner */}
    {anchorMemberId === ownerMemberId && (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-ft-v500/20
                       text-ft-v200 border border-ft-v500/30">
        You
      </span>
    )}
    <ChevronDown className="w-4 h-4 text-ft-text3" />
  </button>

  {/* Anchor picker dropdown */}
  {showAnchorPicker && (
    <div className="bg-ft-bg2 border border-ft-border2 rounded-xl overflow-hidden shadow-xl">
      {/* Search input */}
      <div className="p-2 border-b border-ft-border">
        <input
          autoFocus
          type="text"
          placeholder="Search family members..."
          value={anchorSearch}
          onChange={e => setAnchorSearch(e.target.value)}
          className="w-full bg-ft-bg3 border border-ft-border rounded-lg px-3 py-2
                     text-sm text-ft-text placeholder-ft-text3 focus:outline-none
                     focus:border-ft-v400 transition-colors"
        />
      </div>

      {/* Member list */}
      <div className="max-h-48 overflow-y-auto">
        {members
          .filter(m =>
            m.id !== newMemberId &&
            m.name.toLowerCase().includes(anchorSearch.toLowerCase())
          )
          .map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setAnchorMemberId(m.id)
                setSelectedRelation(null)  // reset relation when anchor changes
                setShowAnchorPicker(false)
                setAnchorSearch('')
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                         hover:bg-ft-border transition-colors text-sm
                         ${anchorMemberId === m.id ? 'bg-ft-v500/10 text-ft-v200' : 'text-ft-text'}`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ft-v600 to-ft-v500
                              flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {m.name[0]}
              </div>
              <span className="flex-1">{m.name}</span>
              {m.id === ownerMemberId && (
                <span className="text-[10px] text-ft-text3">You</span>
              )}
              {anchorMemberId === m.id && (
                <Check className="w-3.5 h-3.5 text-ft-v400" />
              )}
            </button>
          ))}
      </div>
    </div>
  )}
</div>
```

#### Relation label update

When an anchor other than the owner is selected, update the relation field label:

```tsx
<label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
  {anchorMemberId === ownerMemberId
    ? 'Their relation to you'
    : `Their relation to ${anchorMember?.name}`}
</label>
```

#### Relation options — always the same set

Keep the same relation options regardless of anchor. The framing is always from
the anchor's perspective — "Parent of [anchor]", "Child of [anchor]", etc. The
relation labels in the select should reflect this:

```tsx
const relationOptions = [
  { value: 'Parent',    label: `Parent of ${anchorMember?.name ?? 'them'}` },
  { value: 'Child',     label: `Child of ${anchorMember?.name ?? 'them'}` },
  { value: 'Spouse',    label: `Spouse of ${anchorMember?.name ?? 'them'}` },
  { value: 'Sibling',   label: `Sibling of ${anchorMember?.name ?? 'them'}` },
  { value: 'Grandparent', label: `Grandparent of ${anchorMember?.name ?? 'them'}` },
  { value: 'Aunt/Uncle',  label: `Aunt/Uncle of ${anchorMember?.name ?? 'them'}` },
  { value: 'Other',     label: 'Other / connect manually' },
]
```

#### Updated submit handler

Pass `anchorMemberId` instead of `ownerMemberId` into `deriveRelationships()`:

```ts
const derived = deriveRelationships(
  newMember.id,
  anchorMemberId,   // ← was ownerMemberId, now the selected anchor
  selectedRelation,
  treeId,
  treeStore.members,
  treeStore.relationships,
  grandparentTargetId ?? undefined
)
```

#### Disambiguation check update

The disambiguation picker (which parent does this grandparent belong to) now
checks parents of the **anchor**, not the owner:

```tsx
const anchorParents = useMemo(() => {
  if (selectedRelation !== 'Grandparent') return []
  return relationships
    .filter(r => r.type === 'parent_of' && r.to_id === anchorMemberId)
    .map(r => members.find(m => m.id === r.from_id))
    .filter(Boolean) as Member[]
}, [selectedRelation, anchorMemberId, relationships, members])

// Show picker when anchorParents.length >= 2 (was ownerParents.length >= 2)
{selectedRelation === 'Grandparent' && anchorParents.length >= 2 && (
  // ...same picker UI, using anchorParents instead of ownerParents
)}
```

---

### 3. Shortcut — "Add relative" from MemberSidebar

The most natural entry point for adding extended family is directly from a
person's node. Add an "Add relative" button to `MemberSidebar` that opens
`MemberFormModal` with that member pre-selected as the anchor:

```tsx
// In MemberSidebar quick actions row, add:
<button
  onClick={() => {
    openAddMemberModal({ anchorMemberId: selectedMemberId })
  }}
  className="flex items-center gap-2 text-sm text-ft-text2 hover:text-ft-text
             transition-colors py-2"
>
  <UserPlus className="w-4 h-4 text-ft-v400" />
  Add relative
</button>
```

This means: tap on Grandmother → tap "Add relative" → modal opens with
"Adding relative of Ramesh's Mother" pre-filled → select "Parent" →
great-grandparent is wired correctly in one step.

`openAddMemberModal` should accept an optional `{ anchorMemberId }` param and
set the anchor state before opening. Pass this via a shared modal state in
`treeStore` or via a simple callback prop — whichever pattern is already used
in the codebase.

---

### 4. Toolbar "Add member" button — default behaviour unchanged

The `+` button in the toolbar still opens the modal with the owner as the
default anchor. The anchor picker just lets the user change it. No regression
for the common case.

---

## How common scenarios now work

| Scenario | Old flow | New flow |
|---|---|---|
| Add great-grandparent | Add as "Other" → manual wire → remove loose edge (3 steps) | Tap grandparent node → "Add relative" → select "Parent" → done (1 step) |
| Add spouse's parents | Same painful flow | Tap spouse node → "Add relative" → select "Parent" → auto-wired to spouse |
| Add grandparent's sibling | Same | Tap grandparent → "Add relative" → select "Sibling" → auto-wired |
| Add parent (existing flow) | Works | Unchanged — owner is default anchor |
| Add sibling (existing flow) | Works | Unchanged |

---

## Files to change

- `src/lib/treeUtils.ts` — rename `ownerId` → `anchorId` throughout `deriveRelationships()`
- `src/components/tree/MemberFormModal.tsx` — anchor picker UI, updated submit handler, updated disambiguation check, dynamic relation labels
- `src/components/tree/MemberSidebar.tsx` — "Add relative" button that pre-sets the anchor

## Testing checklist

- [ ] Default behaviour: toolbar `+` → anchor defaults to owner → add Parent/Sibling/Child/Spouse all work as before
- [ ] Tap Grandmother node → "Add relative" → select "Parent" → great-grandparent wired as `parent_of` grandmother, `spouse_of` grandfather (if grandfather exists)
- [ ] Tap Spouse node → "Add relative" → select "Parent" → spouse's parent wired correctly, not connected to owner's side
- [ ] Tap Grandparent → "Add relative" → select "Sibling" → great-uncle/aunt wired as `sibling_of` grandparent and `parent_of` by great-grandparents (if they exist)
- [ ] Anchor picker search filters correctly
- [ ] Relation label updates to "Parent of Ramesh" when Ramesh is selected as anchor
- [ ] Disambiguation picker appears when adding grandparent of someone who has 2 parents
- [ ] Changing anchor resets the selected relation (prevents stale relation from previous anchor)
- [ ] No regression: owner-anchored additions still auto-wire correctly
