# Family Trail — CLAUDE.md

## Project overview

Family Trail is a collaborative family tree PWA. Users build their side of the tree and invite relatives to add theirs. Trees merge at shared members, creating a full, living family tree together.

**Product positioning:** Elegant & premium. Dark jewel-tone UI. Nothing like a typical genealogy tool.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (custom config — see design tokens below) |
| State | Zustand |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Tree rendering | React Flow (`@xyflow/react`) |
| Animation | Framer Motion |
| Fonts | Cormorant Garamond (display) + Inter (UI) — Google Fonts |
| PWA | vite-plugin-pwa + Workbox |
| Icons | Lucide React |
| Date handling | date-fns |

---

## Design system

### Philosophy
- Dark-first. Background is `#08060F`. Never use white backgrounds.
- Jewel tones only. The palette is purples/violets primary, teal for spouse's side, gold for children, rose for accents.
- Cormorant Garamond for all display text (headings, names, hero copy). Inter for all UI chrome.
- Generous border-radius. Cards are `rounded-2xl`, nodes are `rounded-xl`.
- Subtle borders using `rgba(160, 130, 255, 0.12)` — never hard white borders.

### Tailwind custom tokens (tailwind.config.ts)

```ts
colors: {
  ft: {
    bg:      '#08060F',
    bg2:     '#100D1E',
    bg3:     '#17132B',
    bg4:     '#1F1A38',
    border:  'rgba(160,130,255,0.12)',
    border2: 'rgba(160,130,255,0.22)',
    border3: 'rgba(160,130,255,0.40)',
    // Violet ramp (primary)
    v50:  '#F3F0FF',
    v100: '#DDD5FF',
    v200: '#C4B5FD',
    v400: '#9B7AFF',
    v500: '#7C5CFF',
    v600: '#6344E0',
    v700: '#4B30B8',
    // Accents
    teal:  '#2DD4BF',
    gold:  '#D4A843',
    rose:  '#E879A0',
    // Text
    text:  '#EDE9FF',
    text2: 'rgba(237,233,255,0.6)',
    text3: 'rgba(237,233,255,0.3)',
  }
}
fontFamily: {
  display: ['Cormorant Garamond', 'Georgia', 'serif'],
  sans:    ['Inter', 'system-ui', 'sans-serif'],
}
```

### Key UI patterns

**Gradient buttons (primary CTA):**
```tsx
className="bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl px-8 py-3.5 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,92,255,0.45)] transition-all"
```

**Glass cards:**
```tsx
className="bg-ft-bg3 border border-ft-border rounded-2xl p-5"
```

**Ghost buttons:**
```tsx
className="border border-ft-border2 text-ft-v200 rounded-2xl px-8 py-3.5 hover:bg-ft-border hover:border-ft-border3 transition-all"
```

**Section headings (display font):**
```tsx
className="font-display text-4xl font-bold text-ft-text leading-tight"
```

**Muted labels:**
```tsx
className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium"
```

---

## Data model

### Tables (Supabase Postgres)

```sql
-- Trees: one per family
trees (
  id uuid PK,
  name text NOT NULL,
  owner_id uuid FK -> auth.users,
  visibility text DEFAULT 'private', -- 'private' | 'shared' | 'public'
  created_at timestamptz DEFAULT now()
)

-- Members: nodes in the graph (person in the tree)
-- user_id is nullable — deceased/unclaimed members have no account
members (
  id uuid PK,
  tree_id uuid FK -> trees,
  user_id uuid FK -> auth.users NULLABLE,
  name text NOT NULL,
  gender text, -- 'male' | 'female' | 'other'
  dob date NULLABLE,
  dod date NULLABLE,   -- null = living
  photo_url text NULLABLE,
  bio text NULLABLE,
  occupation text NULLABLE,
  location text NULLABLE,
  is_living boolean DEFAULT true,
  created_by uuid FK -> auth.users,
  created_at timestamptz DEFAULT now()
)

-- Relationships: edges in the graph
relationships (
  id uuid PK,
  tree_id uuid FK -> trees,
  from_id uuid FK -> members,
  to_id uuid FK -> members,
  type text NOT NULL, -- 'parent_of' | 'spouse_of' | 'sibling_of'
  created_at timestamptz DEFAULT now()
)

-- Invites: share links
invites (
  id uuid PK,
  tree_id uuid FK -> trees,
  member_id uuid FK -> members NULLABLE, -- which node to claim
  token text UNIQUE NOT NULL,
  role text DEFAULT 'editor', -- 'editor' | 'viewer'
  created_by uuid FK -> auth.users,
  expires_at timestamptz,
  claimed_by uuid FK -> auth.users NULLABLE,
  claimed_at timestamptz NULLABLE
)

-- ACL: who has access to which tree
tree_members (
  tree_id uuid FK -> trees,
  user_id uuid FK -> auth.users,
  role text NOT NULL, -- 'owner' | 'editor' | 'viewer'
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (tree_id, user_id)
)
```

### Key design decisions
- **Members ≠ Users.** A member node exists even for deceased ancestors with no account. `user_id` is nullable.
- **Graph not tree.** Relationships are edges. This handles remarriage, step-siblings, cousins marrying.
- **Side colouring.** In the UI, determine which "side" a member belongs to by traversing the graph from the owner. Owner's side = violet. Spouse's subtree = teal. Children = gold.
- **RLS.** All tables use Supabase Row Level Security. Only tree_members can read/write their tree.

---

## App structure

```
src/
  components/
    tree/
      TreeCanvas.tsx       # React Flow canvas wrapper
      MemberNode.tsx       # Custom node component
      RelationshipEdge.tsx # Custom edge component
      AddMemberModal.tsx   # Add/edit member drawer
    profile/
      MemberProfile.tsx
      ProfileHeader.tsx
    invite/
      InvitePanel.tsx
      PendingInvites.tsx
    ui/
      Button.tsx
      Avatar.tsx
      Badge.tsx
      Modal.tsx
  pages/
    Landing.tsx
    Auth.tsx
    Dashboard.tsx          # List of trees
    TreeView.tsx           # Main canvas page
    MemberPage.tsx
    InviteClaim.tsx        # /join/:token
    Settings.tsx
  store/
    treeStore.ts           # Zustand: current tree, members, relationships
    authStore.ts           # Zustand: user session
  lib/
    supabase.ts            # Supabase client
    treeUtils.ts           # Graph traversal, side detection, layout helpers
  hooks/
    useTree.ts             # Fetch + realtime subscribe to tree
    useMembers.ts
    useInvite.ts
```

---

## React Flow setup

```tsx
// MemberNode.tsx — custom node
// Colour is passed via node.data.side: 'owner' | 'spouse' | 'child' | 'ancestor'
const sideStyles = {
  owner:    { border: '#9B7AFF', bg: 'rgba(124,92,255,0.25)' },
  ancestor: { border: 'rgba(155,122,255,0.3)', bg: 'rgba(124,92,255,0.15)' },
  spouse:   { border: 'rgba(45,212,191,0.5)',  bg: 'rgba(45,212,191,0.18)' },
  child:    { border: 'rgba(212,168,67,0.35)', bg: 'rgba(212,168,67,0.15)' },
}
```

React Flow config:
- `fitView` on load
- `minZoom: 0.3`, `maxZoom: 2`
- Custom connection line style matching the violet palette
- Dagre layout (`@dagrejs/dagre`) for automatic tree positioning — install as dependency
- Horizontal layout (`rankdir: 'TB'`) — top-to-bottom generations

---

## Supabase Realtime

Subscribe to tree changes in `useTree.ts`:
```ts
supabase
  .channel(`tree:${treeId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `tree_id=eq.${treeId}` }, handleChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'relationships', filter: `tree_id=eq.${treeId}` }, handleChange)
  .subscribe()
```

---

## PWA config

```ts
// vite.config.ts — VitePWA plugin
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Family Trail',
    short_name: 'FamilyTrail',
    theme_color: '#08060F',
    background_color: '#08060F',
    display: 'standalone',
    icons: [/* 192, 512 */]
  }
})
```

---

## Session structure

| Session | Goal |
|---|---|
| 1 | Project scaffold, Tailwind tokens, font setup, Landing page, Auth page |
| 2 | Supabase schema, RLS policies, authStore, Dashboard (tree list) |
| 3 | Tree canvas with React Flow + Dagre layout, MemberNode component |
| 4 | Add/edit member modal, relationships, real-time sync |
| 5 | Member profile page, connections grid |
| 6 | Invite system — generate link, claim flow, InviteClaim page |
| 7 | Photo upload (Supabase Storage), PWA config, mobile polish |
| 8 | Permissions (editor/viewer), Settings page, GA4, launch prep |

---

## Code conventions

- All components in `.tsx`, all utilities in `.ts`
- `async/await` everywhere — no `.then()` chains
- Supabase calls always wrapped in try/catch, errors surfaced via toast
- Zustand stores use `immer` middleware for nested state updates
- Framer Motion `variants` defined outside component to avoid re-creation
- All colours via Tailwind `ft-*` tokens — never hardcoded hex in JSX
- Mobile-first: base styles for mobile, `md:` and `lg:` for desktop
- Max content width `max-w-6xl mx-auto` on dashboard/landing — tree canvas is full-bleed

---

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
