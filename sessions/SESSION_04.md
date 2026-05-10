# Session 4 — Edit member, relationships panel, member sidebar, realtime polish

## Context
Sessions 1–3 complete. Tree canvas renders with React Flow + Dagre. Members can be added. Realtime sync works. Read CLAUDE.md before starting.

---

## Goals for this session

1. Edit member — extend `AddMemberModal` into a full `MemberFormModal` (add + edit)
2. Build the `MemberSidebar` — slides in when a node is clicked, shows profile + actions
3. Build a `RelationshipsPanel` — add/remove connections between existing members
4. Delete member with confirmation
5. Polish realtime — optimistic UI updates so the canvas feels instant
6. Mobile canvas UX — pinch to zoom works, bottom sheet instead of sidebar on mobile

---

## Step 1 — MemberFormModal (add + edit)

Rename/replace `AddMemberModal.tsx` → `MemberFormModal.tsx`. Accept an optional `member` prop — if present, it's edit mode; if null, it's add mode.

Additional fields for edit mode:
- Photo upload (placeholder UI — actual upload in Session 7)
- Occupation — text input
- Location — text input
- Bio — textarea (max 300 chars, live counter)
- Date of death + "Mark as deceased" toggle (sets `is_living: false`, shows `dod` field)

Modal header changes per mode:
- Add: `font-display text-2xl "Add a family member"`
- Edit: `font-display text-2xl "Edit {member.name}"`

On submit for edit:
```ts
await supabase
  .from('members')
  .update({ name, gender, dob, dod, occupation, location, bio, is_living })
  .eq('id', member.id)
// Realtime will update the store — no manual state update needed
```

**Optimistic update pattern** — before the Supabase call, call `treeStore.upsertMember(optimisticMember)`. On error, revert with the original member data and show a toast.

---

## Step 2 — MemberSidebar

Create `src/components/tree/MemberSidebar.tsx`.

Triggered when `treeStore.selectedMemberId` is set. Slides in from the right.

**Animation:**
```tsx
<AnimatePresence>
  {selectedMemberId && (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="absolute right-0 top-0 h-full w-80 bg-ft-bg2 border-l border-ft-border z-10 overflow-y-auto"
    >
```

**On mobile** (`< md` breakpoint): render as a bottom sheet instead of a right panel.
```tsx
// Bottom sheet animation: y: '100%' → y: 0
// Height: 70vh, rounded-t-3xl, drag-to-dismiss via Framer Motion drag="y"
```

Sidebar contents:
1. **Header** — close button (X), avatar circle, name (`font-display text-xl`), side badge (Owner / Spouse's side / Child)
2. **Quick actions row** — Edit (pencil icon), Add connection (link icon), Delete (trash icon — red, shows confirmation)
3. **Info fields** — DOB, location, occupation, bio (only show fields that have values)
4. **Connections section** — list of related members with their relation type. Each is a clickable chip that sets `selectedMemberId` to that person.

---

## Step 3 — RelationshipsPanel

Create `src/components/tree/RelationshipsPanel.tsx`. Opened from the sidebar "Add connection" button.

This panel lets the user wire two existing members together manually — useful when auto-detection from "relation to me" wasn't enough.

UI:
- "Connect {memberName} to..."
- Searchable dropdown of all other members in the tree (filter by name as user types)
- Relationship type selector: Parent of / Child of / Spouse of / Sibling of
- "Add connection" button

On submit:
```ts
// Map the UI selection to from_id/to_id correctly:
// "Parent of selected" → { from_id: currentMember.id, to_id: selectedMember.id, type: 'parent_of' }
// "Child of selected"  → { from_id: selectedMember.id, to_id: currentMember.id, type: 'parent_of' }
// "Spouse of"          → { from_id: currentMember.id, to_id: selectedMember.id, type: 'spouse_of' }
// "Sibling of"         → { from_id: currentMember.id, to_id: selectedMember.id, type: 'sibling_of' }

await supabase.from('relationships').insert({ tree_id, from_id, to_id, type })
// Realtime updates canvas automatically
```

Also show existing connections for this member in this panel, each with a delete (×) button to remove the relationship.

---

## Step 4 — Delete member

In `MemberSidebar`, the delete button opens an inline confirmation (not a separate modal — keep it in the sidebar):

```tsx
// Replace action row with:
// "Are you sure? This will remove {name} and all their connections."
// [Cancel] [Delete] — Delete is bg-red-500/20 text-red-400 border border-red-500/30
```

On confirm:
```ts
// Delete relationships first (cascade should handle it, but be explicit)
await supabase.from('relationships')
  .delete()
  .or(`from_id.eq.${memberId},to_id.eq.${memberId}`)

// Delete member
await supabase.from('members').delete().eq('id', memberId)

// Close sidebar
treeStore.setSelectedMember(null)
```

Optimistic: immediately call `treeStore.removeMember(memberId)` before the network call.

---

## Step 5 — Realtime polish

Improve the realtime experience:

**Visual pulse on new nodes:** When a member is added via realtime (i.e. not by the current user — check `created_by !== authStore.user.id`), briefly animate the new node with a scale pulse:
```tsx
// In MemberNode, use useEffect watching a 'isNew' flag in node.data
// animate: scale 1 → 1.12 → 1 over 600ms using Framer Motion
```

**Contributor count** in the toolbar: Show a live count of distinct `created_by` values across all members. Updates automatically via the realtime store.

**"X is editing..." indicator** (stretch goal): Use Supabase Presence on the realtime channel to broadcast when a user opens the edit modal, and show a small "Priya is editing" badge on that node.

---

## Step 6 — Mobile canvas UX

React Flow handles pinch-to-zoom natively on mobile — verify it works on iOS/Android.

Additional mobile polish:
- **Bottom bar** on mobile (instead of toolbar icons being squeezed): a fixed bottom bar with 3 large icon buttons — Add member, Share, Search. The top bar on mobile shows only back arrow + tree name.
- **Node tap on mobile**: single tap selects (opens bottom sheet), double tap zooms to fit that person's connections.
- **Fit view button**: always visible floating button bottom-right on mobile (`btn-ghost` small, round) that calls `reactFlowInstance.fitView()`

---

## Step 7 — Toast system

Add a lightweight toast for success/error feedback throughout the app.

Use a simple Zustand-based toast store + a `<ToastContainer />` component rendered in `App.tsx`. No external library needed.

```ts
// src/store/toastStore.ts
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
// addToast(message, type) — auto-removes after 3s
```

Toast UI: fixed bottom-centre, `bg-ft-bg3 border border-ft-border2 rounded-2xl px-4 py-3 text-sm`. Success has a teal left border, error has rose.

Replace all `console.error` calls with `addToast(message, 'error')`.

---

## Deliverables checklist

- [ ] `MemberFormModal.tsx` — add + edit mode, all fields, optimistic updates
- [ ] `MemberSidebar.tsx` — right panel on desktop, bottom sheet on mobile
- [ ] `RelationshipsPanel.tsx` — add/remove connections between existing members
- [ ] Delete member with inline confirmation + optimistic removal
- [ ] Realtime new-node pulse animation
- [ ] Live contributor count in toolbar
- [ ] Mobile bottom bar navigation
- [ ] Fit view floating button on mobile
- [ ] Toast system (toastStore + ToastContainer)
- [ ] No TypeScript errors
