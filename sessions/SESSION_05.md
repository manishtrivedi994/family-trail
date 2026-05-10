# Session 5 — Member profile page + connections grid

## Context
Sessions 1–4 complete. Tree canvas works with edit/delete, sidebar, relationships panel, and mobile polish. Read CLAUDE.md before starting.

---

## Goals for this session

1. Build the full `MemberPage` — a dedicated profile page for each member
2. Build the `ProfileHeader` with gradient banner + avatar
3. Build the `ConnectionsGrid` — visual grid of related members
4. Add a "Focus mode" — zoom the canvas to a specific member + their immediate family
5. Navigate between the canvas and profile pages fluidly
6. Birthdays & anniversaries widget on the Dashboard

---

## Step 1 — MemberPage route

Add route: `/tree/:treeId/member/:memberId` → `<MemberPage />`

Protected route. Fetch the member + their relationships + connected members.

```ts
// src/hooks/useMember.ts
export function useMember(treeId: string, memberId: string) {
  // Fetch member
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  // Fetch all relationships for this member
  const { data: rels } = await supabase
    .from('relationships')
    .select('*')
    .eq('tree_id', treeId)
    .or(`from_id.eq.${memberId},to_id.eq.${memberId}`)

  // Fetch connected member details
  const connectedIds = rels.map(r => r.from_id === memberId ? r.to_id : r.from_id)
  const { data: connections } = await supabase
    .from('members')
    .select('*')
    .in('id', connectedIds)

  return { member, relationships: rels, connections }
}
```

---

## Step 2 — ProfileHeader

Create `src/components/profile/ProfileHeader.tsx`.

**Banner:** 100px tall gradient div. Background varies by side:
- owner/ancestor: `linear-gradient(135deg, #1A1040 0%, #2E1A6E 50%, #1A2840 100%)`
- spouse side: `linear-gradient(135deg, #0A2420 0%, #0F4A3C 50%, #0A2440 100%)`
- child: `linear-gradient(135deg, #2A1A00 0%, #4A3000 50%, #1A2000 100%)`

Two animated orbs inside the banner (same Framer Motion pulse as Landing).

**Avatar:** `w-20 h-20 rounded-full` — overlaps banner with `mt-[-40px]`. If `photo_url` exists, show the image. Otherwise show initials in a gradient circle. Border: `border-4 border-ft-bg`.

Avatar gradient by side:
- owner: `from-ft-v500 to-ft-v400`
- spouse: `from-ft-teal to-[#0F766E]`
- child: `from-ft-gold to-[#92730A]`
- ancestor: `from-ft-v700 to-ft-v600`

**Below avatar:**
- Name: `font-display text-3xl font-bold`
- Side label: `text-xs uppercase tracking-widest text-ft-text3` (e.g. "Owner · your profile" / "Spouse's side")
- Chips row: relation tags (Son, Father, etc. — derived from relationships)
- Action buttons row: Edit (btn-ghost small), View in tree (btn-ghost small → navigate back to tree with this node focused)

---

## Step 3 — Profile info fields

Create `src/components/profile/ProfileFields.tsx`.

Display each field in a consistent `info-row` pattern:
```tsx
// Icon in a rounded square (bg gradient violet, border ft-border2)
// Label: text-[10px] uppercase tracking-widest text-ft-text3
// Value: text-sm font-medium text-ft-text
```

Fields to show (skip if null):
- Date of birth → calculate and show age if `is_living: true`
- Date of death (if `!is_living`)
- Location
- Occupation
- Bio (full text, not truncated)

**"Claimed / Unclaimed" status:**
If `member.user_id` is set: show a small teal chip "Account linked"
If `member.user_id` is null: show an amber chip "Not yet joined" + a "Send invite" button (links to invite flow with this member pre-selected)

---

## Step 4 — ConnectionsGrid

Create `src/components/profile/ConnectionsGrid.tsx`.

Group connections by relationship type:

**Section: Parents** — members where relationship is `parent_of` and `to_id === memberId`
**Section: Children** — members where relationship is `parent_of` and `from_id === memberId`
**Section: Spouse(s)** — members where type is `spouse_of`
**Section: Siblings** — members where type is `sibling_of`

Each section header: `text-[10px] uppercase tracking-widest text-ft-text3 mb-2`

Connection card (`bg-ft-bg3 border border-ft-border rounded-2xl p-3 flex gap-3 items-center cursor-pointer hover:border-ft-border2 transition-colors`):
- Avatar circle (initials, gradient colour by side)
- Name: `text-sm font-semibold`
- Relation label: `text-[11px] text-ft-text3`
- Chevron right icon

On click: navigate to that member's profile page.

Grid layout: `grid grid-cols-2 md:grid-cols-3 gap-3`

---

## Step 5 — Full MemberPage layout

`src/pages/MemberPage.tsx`:

```tsx
// Full dark page
// Top bar: back arrow (→ /tree/:treeId) + tree name breadcrumb + edit button
// Scrollable content area:
//   <ProfileHeader member={member} side={side} />
//   <ProfileFields member={member} />
//   <ConnectionsGrid connections={connections} relationships={rels} memberId={memberId} />
// Floating: "View in tree" button (bottom-right, btn-primary small) → navigate to tree with fitView on this node
```

---

## Step 6 — "Focus mode" on tree canvas

When navigating back from a MemberPage to the TreeView (or when clicking "View in tree"):

Pass a `?focus=memberId` query parameter. In `TreeView.tsx`:

```ts
const [searchParams] = useSearchParams()
const focusMemberId = searchParams.get('focus')

useEffect(() => {
  if (focusMemberId && reactFlowInstance) {
    const node = reactFlowInstance.getNode(focusMemberId)
    if (node) {
      reactFlowInstance.setCenter(
        node.position.x + 80,
        node.position.y + 36,
        { zoom: 1.4, duration: 800 }
      )
      treeStore.setSelectedMember(focusMemberId)
    }
  }
}, [focusMemberId, reactFlowInstance])
```

Also add a "Focus on me" button in the tree toolbar that zooms to the owner's own node.

---

## Step 7 — Birthdays & anniversaries widget on Dashboard

Add a new section to the Dashboard below the tree grid: **"Coming up"**

Fetch all members across all the user's trees. Filter for members whose `dob` falls within the next 30 days (use `date-fns` `isWithinInterval`, `format`).

Widget card (`card-glass p-5`):
```tsx
// Section title: font-display text-xl "Coming up"
// Sub: text-ft-text3 text-sm "Birthdays in the next 30 days"
// List of upcoming birthdays:
//   Avatar + Name + "turns X on [Month Day]" + days-until badge
//   badge colours: <= 7 days → rose/urgent, 8-14 days → gold, 15-30 → violet
// Empty state: "No upcoming birthdays — add birth dates to your family members"
```

---

## Step 8 — Page transitions

Add smooth page transitions using Framer Motion `AnimatePresence` in `App.tsx`:

```tsx
// Wrap <Routes> with <AnimatePresence mode="wait">
// Each page component wraps its top-level div in:
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2 }}
>
```

---

## Deliverables checklist

- [ ] `useMember.ts` hook
- [ ] `ProfileHeader.tsx` — banner, avatar, chips, actions
- [ ] `ProfileFields.tsx` — all fields with icons
- [ ] `ConnectionsGrid.tsx` — grouped by relation type
- [ ] `MemberPage.tsx` — full page wiring
- [ ] Focus mode on TreeView (`?focus=memberId`)
- [ ] "Focus on me" button in toolbar
- [ ] Birthdays widget on Dashboard
- [ ] Page transitions with Framer Motion
- [ ] Navigation: Dashboard → TreeView → MemberPage → back all working
- [ ] No TypeScript errors
