# Session 3 — Tree canvas with React Flow + Dagre layout

## Context
Sessions 1 and 2 are complete. Auth, Dashboard, and Supabase schema are all working. Read CLAUDE.md fully before starting. This session builds the core product — the interactive family tree canvas using React Flow with automatic Dagre layout.

---

## Goals for this session

1. Build the full `TreeView` page replacing the stub
2. Create the `useTree` hook — fetch members, relationships, realtime sync
3. Build the Zustand `treeStore`
4. Create `MemberNode` — the custom React Flow node component
5. Create `RelationshipEdge` — custom edge with side-aware colour
6. Wire Dagre layout to auto-position nodes
7. Build the tree toolbar with search, share, add member button
8. Build the `AddMemberModal` (add — no edit yet, that's Session 4)

---

## Step 1 — treeStore

Create `src/store/treeStore.ts`:

```ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Member, Relationship, Tree, MemberSide } from '../types'

interface TreeState {
  tree: Tree | null
  members: Member[]
  relationships: Relationship[]
  loading: boolean
  selectedMemberId: string | null
  setTree: (tree: Tree) => void
  setMembers: (members: Member[]) => void
  setRelationships: (rels: Relationship[]) => void
  setLoading: (v: boolean) => void
  setSelectedMember: (id: string | null) => void
  upsertMember: (m: Member) => void
  removeMember: (id: string) => void
  upsertRelationship: (r: Relationship) => void
  removeRelationship: (id: string) => void
}

export const useTreeStore = create<TreeState>()(
  immer((set) => ({
    tree: null,
    members: [],
    relationships: [],
    loading: true,
    selectedMemberId: null,
    setTree: (tree) => set((s) => { s.tree = tree }),
    setMembers: (members) => set((s) => { s.members = members }),
    setRelationships: (rels) => set((s) => { s.relationships = rels }),
    setLoading: (v) => set((s) => { s.loading = v }),
    setSelectedMember: (id) => set((s) => { s.selectedMemberId = id }),
    upsertMember: (m) => set((s) => {
      const idx = s.members.findIndex(x => x.id === m.id)
      if (idx >= 0) s.members[idx] = m
      else s.members.push(m)
    }),
    removeMember: (id) => set((s) => { s.members = s.members.filter(x => x.id !== id) }),
    upsertRelationship: (r) => set((s) => {
      const idx = s.relationships.findIndex(x => x.id === r.id)
      if (idx >= 0) s.relationships[idx] = r
      else s.relationships.push(r)
    }),
    removeRelationship: (id) => set((s) => { s.relationships = s.relationships.filter(x => x.id !== id) }),
  }))
)
```

---

## Step 2 — useTree hook

Create `src/hooks/useTree.ts`:

```ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTreeStore } from '../store/treeStore'

export function useTree(treeId: string) {
  const store = useTreeStore()

  useEffect(() => {
    if (!treeId) return
    store.setLoading(true)

    // Initial fetch
    async function load() {
      const [{ data: tree }, { data: members }, { data: rels }] = await Promise.all([
        supabase.from('trees').select('*').eq('id', treeId).single(),
        supabase.from('members').select('*').eq('tree_id', treeId),
        supabase.from('relationships').select('*').eq('tree_id', treeId),
      ])
      if (tree) store.setTree(tree)
      store.setMembers(members ?? [])
      store.setRelationships(rels ?? [])
      store.setLoading(false)
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`tree:${treeId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'members',
        filter: `tree_id=eq.${treeId}`
      }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'DELETE') store.removeMember((o as any).id)
        else store.upsertMember(n as any)
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'relationships',
        filter: `tree_id=eq.${treeId}`
      }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'DELETE') store.removeRelationship((o as any).id)
        else store.upsertRelationship(n as any)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [treeId])
}
```

---

## Step 3 — treeUtils — Dagre layout + side detection

Create `src/lib/treeUtils.ts`:

```ts
import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { Member, Relationship, MemberSide } from '../types'

const NODE_WIDTH = 160
const NODE_HEIGHT = 72

export function buildFlowGraph(
  members: Member[],
  relationships: Relationship[],
  ownerId: string // the logged-in user's member id in this tree
): { nodes: Node[], edges: Edge[] } {

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })

  members.forEach((m) => g.setNode(m.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))

  relationships.forEach((r) => {
    if (r.type === 'parent_of') g.setEdge(r.from_id, r.to_id)
  })

  dagre.layout(g)

  // --- Side detection via BFS from owner ---
  const sideMap = new Map<string, MemberSide>()
  sideMap.set(ownerId, 'owner')

  // Find spouse of owner
  const ownerSpouseRels = relationships.filter(
    r => r.type === 'spouse_of' && (r.from_id === ownerId || r.to_id === ownerId)
  )
  const spouseId = ownerSpouseRels.length > 0
    ? (ownerSpouseRels[0].from_id === ownerId ? ownerSpouseRels[0].to_id : ownerSpouseRels[0].from_id)
    : null

  if (spouseId) sideMap.set(spouseId, 'spouse')

  // Children of owner
  relationships.filter(r => r.type === 'parent_of' && r.from_id === ownerId)
    .forEach(r => sideMap.set(r.to_id, 'child'))

  // Owner's ancestors — BFS upward
  const queue = [ownerId]
  while (queue.length) {
    const current = queue.shift()!
    relationships
      .filter(r => r.type === 'parent_of' && r.to_id === current)
      .forEach(r => {
        if (!sideMap.has(r.from_id)) {
          sideMap.set(r.from_id, 'ancestor')
          queue.push(r.from_id)
        }
      })
  }

  // Spouse's ancestors — BFS upward from spouse
  if (spouseId) {
    const spouseQueue = [spouseId]
    while (spouseQueue.length) {
      const current = spouseQueue.shift()!
      relationships
        .filter(r => r.type === 'parent_of' && r.to_id === current)
        .forEach(r => {
          if (!sideMap.has(r.from_id)) {
            sideMap.set(r.from_id, 'spouse')
            spouseQueue.push(r.from_id)
          }
        })
    }
  }

  // Fallback
  members.forEach(m => { if (!sideMap.has(m.id)) sideMap.set(m.id, 'unknown') })

  // --- Build React Flow nodes ---
  const nodes: Node[] = members.map((m) => {
    const pos = g.node(m.id)
    return {
      id: m.id,
      type: 'memberNode',
      position: { x: pos ? pos.x - NODE_WIDTH / 2 : 0, y: pos ? pos.y - NODE_HEIGHT / 2 : 0 },
      data: {
        member: m,
        side: sideMap.get(m.id) ?? 'unknown',
      },
    }
  })

  // --- Build React Flow edges ---
  const edges: Edge[] = relationships.map((r) => ({
    id: r.id,
    source: r.from_id,
    target: r.to_id,
    type: 'relationshipEdge',
    data: { relType: r.type },
  }))

  return { nodes, edges }
}
```

---

## Step 4 — MemberNode component

Create `src/components/tree/MemberNode.tsx`:

Side → visual style mapping:
```ts
const sideConfig: Record<MemberSide, { border: string, bg: string, textAccent: string }> = {
  owner:    { border: '#9B7AFF', bg: 'rgba(124,92,255,0.25)',  textAccent: '#C4B5FD' },
  ancestor: { border: 'rgba(155,122,255,0.3)', bg: 'rgba(124,92,255,0.12)', textAccent: 'rgba(196,181,253,0.7)' },
  spouse:   { border: 'rgba(45,212,191,0.5)',  bg: 'rgba(45,212,191,0.18)', textAccent: '#2DD4BF' },
  child:    { border: 'rgba(212,168,67,0.4)',  bg: 'rgba(212,168,67,0.15)', textAccent: '#D4A843' },
  unknown:  { border: 'rgba(160,130,255,0.2)', bg: 'rgba(160,130,255,0.08)', textAccent: 'rgba(237,233,255,0.5)' },
}
```

Node JSX (`w-40 rounded-xl px-3 py-2.5 cursor-pointer transition-transform hover:scale-105`):
```tsx
<div style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
  {/* Avatar circle — initials, gradient bg */}
  {/* Name — font-display text-sm font-semibold text-ft-text */}
  {/* Relation sub-label — text-[10px] */}
  {/* Handles: top + bottom for parent_of, left+right for spouse_of */}
</div>
```

React Flow handles:
- `<Handle type="target" position={Position.Top} />` — styled: `w-2 h-2 rounded-full bg-ft-border2 border border-ft-border3`
- `<Handle type="source" position={Position.Bottom} />`
- Left + right handles for spouse connections

On click: call `treeStore.setSelectedMember(member.id)`

---

## Step 5 — RelationshipEdge component

Create `src/components/tree/RelationshipEdge.tsx`:

```tsx
// Custom edge using getBezierPath / getStraightPath from @xyflow/react
// relType === 'parent_of'  → solid violet line rgba(155,122,255,0.35) stroke-width 1.5
// relType === 'spouse_of'  → dashed line rgba(255,255,255,0.12) stroke-dasharray="4 3"
// relType === 'sibling_of' → dotted line rgba(155,122,255,0.2)
// No labels on edges — meaning is clear from the visual
```

---

## Step 6 — TreeCanvas component

Create `src/components/tree/TreeCanvas.tsx`:

```tsx
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom node and edge type registrations
const nodeTypes = { memberNode: MemberNode }
const edgeTypes = { relationshipEdge: RelationshipEdge }

// ReactFlow config
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  fitView
  fitViewOptions={{ padding: 0.2 }}
  minZoom={0.2}
  maxZoom={2.5}
  defaultEdgeOptions={{ type: 'relationshipEdge' }}
  proOptions={{ hideAttribution: true }}
>
  <Background color="rgba(160,130,255,0.04)" gap={24} />
  <Controls
    style={{ background: 'var(--ft-bg3)', border: '1px solid var(--ft-border)' }}
  />
  <MiniMap
    style={{ background: '#100D1E', border: '1px solid rgba(160,130,255,0.12)' }}
    nodeColor={(n) => {
      const side = n.data?.side as MemberSide
      if (side === 'owner') return '#9B7AFF'
      if (side === 'spouse') return '#2DD4BF'
      if (side === 'child') return '#D4A843'
      return 'rgba(155,122,255,0.3)'
    }}
  />
</ReactFlow>
```

Override React Flow default CSS to match dark theme — add to `index.css`:
```css
.react-flow__renderer { background: #08060F; }
.react-flow__controls button {
  background: #17132B;
  border-color: rgba(160,130,255,0.12);
  color: rgba(237,233,255,0.6);
}
.react-flow__controls button:hover { background: #1F1A38; color: #EDE9FF; }
```

---

## Step 7 — TreeView page

Replace the stub `src/pages/TreeView.tsx`:

```tsx
// useParams to get treeId
// useTree(treeId) — fetch + subscribe
// Get owner's member id: find member where user_id === authStore.user.id
// Build flow graph: buildFlowGraph(members, relationships, ownerMemberId)
// Re-run buildFlowGraph whenever members or relationships change (useMemo)

// Layout:
// Full screen: flex flex-col bg-ft-bg h-screen
// Top: <TreeToolbar /> (fixed height ~52px)
// Body: flex-1 relative → <TreeCanvas /> fills it
// Right panel (conditional): <MemberSidebar /> slides in when selectedMemberId is set
```

**Loading state:** full-screen centred spinner with "Loading your family tree..." in `font-display text-ft-text2`.

**Empty state** (no members yet): centred overlay on the canvas with a `btn-primary` "Add the first member" button.

---

## Step 8 — TreeToolbar

Create `src/components/tree/TreeToolbar.tsx`:

```tsx
// bg-ft-bg2/90 backdrop-blur border-b border-ft-border px-4 py-2.5 flex items-center justify-between

// Left:
//   Back arrow → /dashboard
//   Tree name (font-display text-lg font-semibold)
//   Contributor count pill (pill-v: "3 contributors")
//   Live badge (pill-g with animated green dot: "Live")

// Right:
//   Search icon button (opens a search panel — stub for now, just show a toast "Search coming soon")
//   Share icon button (opens InvitePanel — Session 6, stub for now)
//   Add member icon button (opens AddMemberModal)
//   Avatar of current user
```

---

## Step 9 — AddMemberModal (add only)

Create `src/components/tree/AddMemberModal.tsx`:

Modal triggered from toolbar. Framer Motion slide-up on mobile, centre fade on desktop.

Fields:
- Name (required) — text input
- Relation to me — select: `['Parent', 'Grandparent', 'Sibling', 'Child', 'Spouse', 'Aunt/Uncle', 'Cousin', 'Other']`
- Gender — radio: Male / Female / Other
- Date of birth — date input (optional)
- Living? — toggle (default true)

On submit:
```ts
// 1. Insert member
const { data: newMember } = await supabase
  .from('members')
  .insert({
    tree_id: treeId,
    name,
    gender,
    dob: dob || null,
    is_living: isLiving,
    created_by: user.id,
  })
  .select().single()

// 2. Derive relationship type from the "relation to me" selection
//    Parent/Grandparent → insert { from_id: newMember.id, to_id: ownerMemberId, type: 'parent_of' }
//    Child             → insert { from_id: ownerMemberId, to_id: newMember.id, type: 'parent_of' }
//    Spouse            → insert { from_id: ownerMemberId, to_id: newMember.id, type: 'spouse_of' }
//    Sibling           → insert { from_id: ownerMemberId, to_id: newMember.id, type: 'sibling_of' }
//    Others            → no automatic relationship, user wires manually later

// 3. Close modal — realtime will update the canvas automatically
```

**Special case — first member:** If there are no members in the tree yet, the first member added IS the owner. In this case:
```ts
// Insert the member with user_id: authStore.user.id (this is the owner claiming their own node)
// No relationship to insert
// Store this member id as the "owner node" — it can be saved in the tree row or derived at runtime
```

---

## Deliverables checklist

- [ ] `treeStore.ts` with all state and actions
- [ ] `useTree.ts` hook with fetch + realtime subscription
- [ ] `treeUtils.ts` with `buildFlowGraph` (Dagre layout + side detection)
- [ ] `MemberNode.tsx` — custom node with side-aware colours
- [ ] `RelationshipEdge.tsx` — custom edge with type-aware styling
- [ ] `TreeCanvas.tsx` — React Flow wrapper with dark theme overrides
- [ ] `TreeToolbar.tsx` — back, tree name, pills, action buttons
- [ ] `AddMemberModal.tsx` — add member form with automatic relationship insertion
- [ ] `TreeView.tsx` — full page wiring everything together
- [ ] Empty state and loading state on TreeView
- [ ] No TypeScript errors

---

## Notes

- React Flow requires a parent element with explicit height — use `h-full` on the canvas container
- Dagre layout runs synchronously — it's fine to call it in useMemo
- The "first member = owner" special case is important — without it, side detection has no starting point
- `proOptions={{ hideAttribution: true }}` removes the React Flow watermark (requires their free licence terms to be met — acceptable for development)
