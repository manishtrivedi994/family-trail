# Family Trail — Patch: Auto-wire spouse_of between co-parents

## Project status
All 8 sessions complete. The auto-connection patch (SESSION_PATCH_AUTO_CONNECT.md) has
also been applied. `deriveRelationships()` exists in `src/lib/treeUtils.ts`.

## The bug
When a user adds a Grandparent and selects which parent they belong to, the new
grandparent gets correctly wired as `parent_of` that parent — but it does NOT get
wired as `spouse_of` the existing grandparent on the same side.

Same bug exists one generation up: adding a second Parent doesn't wire `spouse_of`
with the existing parent.

The root cause: `deriveRelationships()` never checks "does this parent node already
have another parent? If so, wire them as spouses."

---

## The fix — `src/lib/treeUtils.ts`

Open `deriveRelationships()` and make the following two changes. Do not touch
anything else in the file.

### Change 1 — `'Parent'` case

Find the existing `'Parent'` case and add one block at the end:

```ts
case 'Parent': {
  addRel(newMemberId, ownerId, 'parent_of')
  siblingsOf(ownerId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))

  // NEW: if owner already has another parent, wire spouse_of between them
  parentsOf(ownerId).forEach(existingParentId => {
    addRel(existingParentId, newMemberId, 'spouse_of')
  })
  break
}
```

### Change 2 — `'Grandparent'` case

There are three branches inside this case (`length === 0`, `length === 1`, and
the disambiguation branch). Add the spouse wiring at the end of the `length === 1`
branch and at the end of the disambiguation branch:

```ts
case 'Grandparent': {
  const ownerParents = parentsOf(ownerId)

  if (ownerParents.length === 0) {
    addRel(newMemberId, ownerId, 'parent_of')

  } else if (ownerParents.length === 1) {
    const parentId = ownerParents[0]
    addRel(newMemberId, parentId, 'parent_of')
    siblingsOf(parentId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))

    // NEW: wire spouse_of with any existing grandparent on the same side
    parentsOf(parentId).forEach(existingGrandparentId => {
      addRel(existingGrandparentId, newMemberId, 'spouse_of')
    })

  } else {
    if (!grandparentTargetParentId) return 'NEEDS_DISAMBIGUATION'
    addRel(newMemberId, grandparentTargetParentId, 'parent_of')
    siblingsOf(grandparentTargetParentId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))

    // NEW: wire spouse_of with any existing grandparent on the same side
    parentsOf(grandparentTargetParentId).forEach(existingGrandparentId => {
      addRel(existingGrandparentId, newMemberId, 'spouse_of')
    })
  }
  break
}
```

---

## Why this works

`parentsOf(parentId)` returns all members already wired as `parent_of` that parent
node — i.e. the existing grandparents on that side. Wiring `spouse_of` between them
and the new grandparent is the correct semantic: two people who share a child are
spouses (or were). The `addRel()` deduplication guard ensures this edge is not
created twice if the user somehow triggers it again.

The same pattern applies at the parent generation: `parentsOf(ownerId)` returns any
existing parent, and the new parent gets `spouse_of` wired with them.

---

## Already-added members (retroactive fix)

The patch only applies to members added going forward. If the user has already added
both grandparents without the spouse edge, they will need to wire it manually via the
RelationshipsPanel. To make this easy, show a one-time prompt in the `MemberSidebar`
when a member matches this condition:

> Member has 2+ nodes that are both `parent_of` the same person, but no `spouse_of`
> edge between them.

```ts
// src/components/tree/MemberSidebar.tsx
// Add this derived check when rendering the sidebar for a member:

const missingSpouseEdges = useMemo(() => {
  // Find all co-parents of this member's children — people who share a child
  // with the selected member but have no spouse_of edge with them
  const myChildren = childrenOf(selectedMemberId, relationships)
  const coParents = myChildren.flatMap(childId =>
    parentsOf(childId, relationships).filter(pid => pid !== selectedMemberId)
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

// In JSX, show a suggestion banner if missingSpouseEdges.length > 0:
{missingSpouseEdges.map(coParent => (
  <div
    key={coParent.id}
    className="flex items-center gap-3 px-4 py-3 bg-ft-gold/10 border border-ft-gold/20 rounded-xl text-sm"
  >
    <span className="text-ft-gold text-xs flex-1">
      {coParent.name} shares a child with {selectedMember.name} — are they spouses?
    </span>
    <button
      onClick={() => linkAsSpouses(selectedMemberId, coParent.id)}
      className="text-ft-gold font-semibold text-xs whitespace-nowrap hover:text-ft-text transition-colors"
    >
      Link as spouses
    </button>
  </div>
))}
```

`linkAsSpouses` inserts the `spouse_of` edge directly:
```ts
async function linkAsSpouses(fromId: string, toId: string) {
  const { error } = await supabase
    .from('relationships')
    .insert({ tree_id: treeId, from_id: fromId, to_id: toId, type: 'spouse_of' })
  if (!error) {
    treeStore.upsertRelationship({
      id: crypto.randomUUID(), tree_id: treeId,
      from_id: fromId, to_id: toId, type: 'spouse_of',
      created_at: new Date().toISOString(),
    })
    addToast('Connected as spouses', 'success')
  }
}
```

This surfaces the missing edge to the user without forcing them to hunt for it
in the RelationshipsPanel.

---

## Files to change

- `src/lib/treeUtils.ts` — two additions inside `deriveRelationships()`
- `src/components/tree/MemberSidebar.tsx` — missing spouse suggestion banner + `linkAsSpouses`

## Testing checklist

- [ ] Add Grandmother first → then add Grandfather selecting same parent → `spouse_of` edge appears between them on canvas automatically
- [ ] Add Father first → then add Mother → `spouse_of` edge appears between parents
- [ ] Add Grandfather first → then add Grandmother → same result (order should not matter)
- [ ] Open sidebar on Grandmother (already in tree without spouse edge) → gold banner appears suggesting Grandfather as spouse → click "Link as spouses" → edge appears, banner disappears
- [ ] Adding a third grandparent (remarriage) → `spouse_of` wired with the existing one on that side only, other side's grandparents untouched
- [ ] `addRel` deduplication: triggering the flow twice does not create a duplicate `spouse_of` edge in the DB
