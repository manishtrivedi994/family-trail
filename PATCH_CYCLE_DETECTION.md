# Family Trail — Patch: Cycle detection in relationship graph

## Project status
All 8 sessions complete. Auto-connect, spouse_of, and anchor-person patches applied.

## The bug

A user was able to add Person A as a parent of their grandparent, then connect
the same Person A as their child — creating a cycle: A is an ancestor AND a
descendant of the owner. The graph accepted it silently.

This breaks Dagre layout (infinite loops), breaks side detection in
`buildFlowGraph()`, and is semantically impossible in a real family tree.

---

## What to build

### 1. `wouldCreateCycle()` in `src/lib/treeUtils.ts`

A directed cycle in a family tree occurs when following `parent_of` edges from
a node eventually leads back to itself. `spouse_of` and `sibling_of` edges are
undirected and cannot form directed cycles — only `parent_of` edges matter for
ancestry cycles.

```ts
/**
 * Returns true if adding a `parent_of` edge from `parentId` → `childId`
 * would create a cycle in the existing graph.
 *
 * A cycle exists if `parentId` is already a descendant of `childId`
 * (i.e. you can reach `parentId` by following parent_of edges from `childId`).
 *
 * Uses iterative BFS to avoid stack overflow on large trees.
 */
export function wouldCreateCycle(
  parentId: string,
  childId: string,
  relationships: Relationship[]
): boolean {
  // BFS downward from childId through parent_of edges.
  // If we reach parentId, adding parentId → childId would close a cycle.
  const visited = new Set<string>()
  const queue: string[] = [childId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === parentId) return true
    if (visited.has(current)) continue
    visited.add(current)

    // Children of current (current → parent_of → child)
    relationships
      .filter(r => r.type === 'parent_of' && r.from_id === current)
      .forEach(r => queue.push(r.to_id))
  }

  return false
}

/**
 * Human-readable explanation of why a cycle would occur.
 * Used in error toasts and validation messages.
 */
export function describeCycleError(
  newMemberName: string,
  anchorName: string,
  relation: string
): string {
  return `Cannot add ${newMemberName} as ${relation} of ${anchorName} — this would create a loop in the family tree. A person cannot be both an ancestor and a descendant of the same individual.`
}
```

---

### 2. Call `wouldCreateCycle()` before any `parent_of` insert

There are two places where `parent_of` relationships are created:

**A. `deriveRelationships()` in `treeUtils.ts`**

Wrap every `addRel(..., 'parent_of')` call with a cycle check:

```ts
function addRel(from_id: string, to_id: string, type: RelationshipType) {
  if (from_id === to_id) return

  // Cycle check — only parent_of edges can create ancestry cycles
  if (type === 'parent_of' && wouldCreateCycle(from_id, to_id, relationships)) {
    // Signal the cycle by pushing to a separate violations array
    cycleViolations.push({ from_id, to_id })
    return
  }

  const duplicate = relationships.some(
    r => r.from_id === from_id && r.to_id === to_id && r.type === type
  ) || result.some(
    r => r.from_id === from_id && r.to_id === to_id && r.type === type
  )
  if (!duplicate) result.push({ tree_id: treeId, from_id, to_id, type })
}
```

Add `cycleViolations` as a local array inside `deriveRelationships()`, and
update the return type to carry it:

```ts
// Update return type:
type DeriveResult =
  | { ok: true; relationships: NewRelationship[] }
  | { ok: false; reason: 'NEEDS_DISAMBIGUATION' }
  | { ok: false; reason: 'CYCLE'; violations: { from_id: string; to_id: string }[] }

export function deriveRelationships(...): DeriveResult {
  const result: NewRelationship[] = []
  const cycleViolations: { from_id: string; to_id: string }[] = []

  // ... existing logic (addRel now pushes to cycleViolations on cycle) ...

  if (/* NEEDS_DISAMBIGUATION condition */) return { ok: false, reason: 'NEEDS_DISAMBIGUATION' }
  if (cycleViolations.length > 0) return { ok: false, reason: 'CYCLE', violations: cycleViolations }
  return { ok: true, relationships: result }
}
```

**B. `RelationshipsPanel.tsx` — manual connection**

This is where the original bug happened (connecting an ancestor as a child).
Add validation before the insert:

```ts
async function handleAddConnection() {
  // Only check parent_of for cycles
  if (relType === 'parent_of') {
    const fromId = /* the "parent" side based on UI selection */
    const toId   = /* the "child" side */

    if (wouldCreateCycle(fromId, toId, treeStore.relationships)) {
      const fromMember = members.find(m => m.id === fromId)
      const toMember   = members.find(m => m.id === toId)
      addToast(
        describeCycleError(fromMember?.name ?? 'This person', toMember?.name ?? 'them', 'parent'),
        'error'
      )
      return
    }
  }

  // Proceed with insert
  await supabase.from('relationships').insert({ tree_id, from_id, to_id, type: relType })
}
```

The UI choice "Parent of / Child of / Spouse of / Sibling of" maps to a
`from_id` and `to_id` — make sure the cycle check uses the correct direction:
- "A is Parent of B" → `wouldCreateCycle(A, B, ...)` — checks if A is already a descendant of B
- "A is Child of B"  → `wouldCreateCycle(B, A, ...)` — checks if B is already a descendant of A

---

### 3. Update `MemberFormModal.tsx` submit handler

Update to handle the new `DeriveResult` type:

```ts
const derived = deriveRelationships(
  newMember.id,
  anchorMemberId,
  selectedRelation,
  treeId,
  treeStore.members,
  treeStore.relationships,
  grandparentTargetId ?? undefined
)

if (!derived.ok) {
  if (derived.reason === 'NEEDS_DISAMBIGUATION') {
    addToast('Please select which parent this grandparent belongs to', 'error')
    // Rollback optimistic member insert
    treeStore.removeMember(newMember.id)
    await supabase.from('members').delete().eq('id', newMember.id)
    return
  }

  if (derived.reason === 'CYCLE') {
    const anchorMember = members.find(m => m.id === anchorMemberId)
    addToast(
      `Cannot add ${name} as ${selectedRelation} of ${anchorMember?.name} — ` +
      `this would create a loop in the family tree.`,
      'error'
    )
    // Rollback optimistic member insert
    treeStore.removeMember(newMember.id)
    await supabase.from('members').delete().eq('id', newMember.id)
    return
  }
}

// derived.ok === true — safe to insert
if (derived.relationships.length > 0) {
  await supabase.from('relationships').insert(derived.relationships)
  // ...optimistic store updates as before
}
```

---

### 4. Retroactive fix — detect and surface existing cycles

Existing trees may already have cycles from before this patch. Detect and
surface them so users can fix them.

Add a `findCycles()` utility:

```ts
/**
 * Finds all cycles in the parent_of graph.
 * Returns an array of cycles, each being an array of member ids forming the loop.
 */
export function findCycles(relationships: Relationship[]): string[][] {
  const parentOfEdges = relationships.filter(r => r.type === 'parent_of')
  const visited = new Set<string>()
  const cycles: string[][] = []

  function dfs(nodeId: string, path: string[], pathSet: Set<string>) {
    if (pathSet.has(nodeId)) {
      // Found a cycle — extract it
      const cycleStart = path.indexOf(nodeId)
      cycles.push(path.slice(cycleStart))
      return
    }
    if (visited.has(nodeId)) return

    pathSet.add(nodeId)
    path.push(nodeId)

    parentOfEdges
      .filter(r => r.from_id === nodeId)
      .forEach(r => dfs(r.to_id, [...path], new Set(pathSet)))

    visited.add(nodeId)
  }

  const allNodes = new Set([
    ...parentOfEdges.map(r => r.from_id),
    ...parentOfEdges.map(r => r.to_id),
  ])
  allNodes.forEach(nodeId => dfs(nodeId, [], new Set()))

  return cycles
}
```

In `TreeCanvas.tsx` (or `TreeView.tsx`), run this check once after the tree
loads and show a warning banner if cycles are found:

```tsx
const cycles = useMemo(
  () => findCycles(relationships),
  [relationships]
)

{cycles.length > 0 && (
  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  bg-rose-500/10 border border-rose-500/25 text-rose-300
                  text-sm shadow-lg max-w-sm text-center">
    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
    <span>
      This tree has {cycles.length} conflicting connection
      {cycles.length > 1 ? 's' : ''}. Open the
      <button
        onClick={() => openRelationshipsPanel()}
        className="underline ml-1 hover:text-rose-200"
      >
        relationships panel
      </button>
      {' '}to fix them.
    </span>
  </div>
)}
```

---

## Files to change

- `src/lib/treeUtils.ts`
  - Add `wouldCreateCycle()`
  - Add `describeCycleError()`
  - Add `findCycles()`
  - Update `deriveRelationships()` — new `DeriveResult` return type, cycle check inside `addRel()`
- `src/components/tree/MemberFormModal.tsx` — handle new `DeriveResult` type, rollback on cycle
- `src/components/tree/RelationshipsPanel.tsx` — cycle check before manual `parent_of` insert
- `src/components/tree/TreeView.tsx` or `TreeCanvas.tsx` — cycle warning banner on load

---

## Testing checklist

- [ ] Add Person A as great-grandparent → then try to add same Person A as child → blocked with clear error toast
- [ ] Add Person A as grandparent → try to connect A as sibling of owner's child via RelationshipsPanel → blocked
- [ ] `spouse_of` between any two members → never blocked (spouses cannot form ancestry cycles)
- [ ] `sibling_of` between any two members → never blocked
- [ ] Adding a legitimate grandparent (no cycle) → works normally, no false positives
- [ ] Tree with a pre-existing cycle (created before this patch) → rose warning banner appears on load
- [ ] Large tree (20+ members) → cycle check completes instantly (BFS is O(V+E))
- [ ] Rollback: if cycle is detected after member is already inserted, member row is deleted and removed from store
