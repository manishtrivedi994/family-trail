# Session 8 — Settings, permissions, GA4, launch polish

## Context
Sessions 1–7 complete. Full-featured app: canvas, profiles, invites, photos, PWA. Read CLAUDE.md before starting. This is the final session before launch — settings, permissions enforcement, analytics, and production polish.

---

## Goals for this session

1. Settings page — tree settings + account settings
2. Full role-based permissions enforcement across the app
3. Google Analytics 4 event tracking
4. Search — search members within a tree
5. "Relationship path" feature — "How am I related to X?"
6. Final production polish — loading states, error boundaries, empty states
7. Deployment setup (Vercel)

---

## Step 1 — Settings page

Route: `/tree/:treeId/settings` → `<TreeSettings />`. Protected, owner-only.

### Tree settings (`src/pages/TreeSettings.tsx`)

```tsx
// Top bar: back arrow → /tree/:treeId, title: "Tree settings"

// Section 1: General
//   Tree name (editable inline — click to edit, save on blur/Enter)
//   Update: supabase.from('trees').update({ name }).eq('id', treeId)

// Section 2: Visibility
//   Three large radio cards:
//   [Private]        bg-ft-bg3 — "Only people you invite can see this tree"
//   [Shared via link] — "Anyone with the invite link can join"
//   [Public]          — "Anyone can view (but not edit)"
//   Selected card: violet border + bg-ft-bg4
//   Update immediately on selection change

// Section 3: Contributors
//   List of tree_members with their role
//   Each row: avatar + name/email + role dropdown (owner can change editor↔viewer)
//   Owners cannot be removed or demoted
//   Remove button (×) for non-owner members — with confirmation

// Section 4: Danger zone
//   bg-ft-bg3 border border-rose-500/20 rounded-2xl p-5
//   "Delete tree" button — text-rose-400 border border-rose-500/30
//   Confirmation: type the tree name to confirm deletion
//   On confirm: delete from trees table (cascade deletes all members, relationships, invites)
//   Redirect to /dashboard after deletion
```

### Account settings (`src/pages/AccountSettings.tsx`)

Route: `/settings`

```tsx
// Section 1: Profile
//   Display name (stored in a profiles table — create if not exists)
//   Profile photo (uses PhotoUpload component)

// Section 2: Notifications (UI only — no backend in MVP)
//   Toggles: New member added / Invite accepted / Birthday reminders
//   Store preferences in localStorage for now

// Section 3: Danger zone
//   "Sign out" (already wired)
//   "Delete account" (stub — show "Contact support to delete your account")
```

Create `profiles` table for display names:
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "users can read all profiles" on profiles for select using (true);
create policy "users can upsert own profile" on profiles for all using (auth.uid() = id);
```

---

## Step 2 — Role-based permissions enforcement

Audit every interactive element in the app and gate it by `treeStore.myRole`.

Create a `usePermissions` hook:

```ts
// src/hooks/usePermissions.ts
export function usePermissions() {
  const myRole = useTreeStore(s => s.myRole)
  return {
    canEdit: myRole === 'owner' || myRole === 'editor',
    canDelete: myRole === 'owner',
    canInvite: myRole === 'owner' || myRole === 'editor',
    canChangeSettings: myRole === 'owner',
    isOwner: myRole === 'owner',
  }
}
```

Apply across the app:
- Add member button in toolbar: hidden if `!canEdit`
- Edit button in MemberSidebar: hidden if `!canEdit`
- Delete button in MemberSidebar: hidden if `!canDelete`
- Share button in toolbar: hidden if `!canInvite`
- Tree settings link in overflow menu: hidden if `!canChangeSettings`
- Drag-to-reposition nodes in React Flow: disabled if `!canEdit` (set `nodesDraggable={canEdit}`)
- RelationshipsPanel add/remove: hidden if `!canEdit`

**Viewer mode indicator:** When `myRole === 'viewer'`, show a subtle read-only badge in the toolbar: `text-[10px] uppercase tracking-widest text-ft-text3 border border-ft-border rounded-full px-2 py-0.5 "View only"`

---

## Step 3 — Google Analytics 4

Install:
```bash
npm install gtag.js
```

Or use the script tag approach (simpler for Vite):

In `index.html`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Create `src/lib/analytics.ts`:
```ts
declare function gtag(...args: any[]): void

export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof gtag === 'undefined') return
  gtag('event', name, params)
}

export function trackPage(path: string) {
  if (typeof gtag === 'undefined') return
  gtag('config', 'G-XXXXXXXXXX', { page_path: path })
}
```

Track these events:
| Event | When |
|---|---|
| `tree_created` | User creates a new tree |
| `member_added` | User adds a family member |
| `invite_generated` | Invite link created |
| `invite_claimed` | New user claims an invite |
| `tree_exported` | Export PNG triggered |
| `pwa_installed` | beforeinstallprompt accepted |
| `member_profile_viewed` | Member profile page opened |
| `search_used` | Search query entered |

Add `trackPage` call in a `useEffect` watching `location.pathname` in `App.tsx`.

---

## Step 4 — Search

Add search functionality in the tree canvas.

Search button in toolbar → opens a search overlay panel (slides down from top):

```tsx
// Overlay: bg-ft-bg2/95 backdrop-blur, positioned below toolbar
// Search input: autofocused, "Search family members...", large text input
// Real-time filtering: as user types, filter members by name

// Results list:
//   Member avatar + name + relation label
//   On click: close search, call reactFlowInstance.setCenter to focus that node + open sidebar

// Keyboard: Escape closes search, arrow keys navigate results, Enter selects
// Empty state: "No members found for '{query}'"
```

Also add search to MemberPage connections — filter the ConnectionsGrid by name when there are 8+ connections.

---

## Step 5 — "How are we related?" feature

In MemberSidebar, add a "Relationship path" button that shows the path between the logged-in user's node and the selected member.

BFS/DFS graph traversal:
```ts
// src/lib/treeUtils.ts — add findPath function
export function findRelationshipPath(
  fromId: string,
  toId: string,
  members: Member[],
  relationships: Relationship[]
): Member[] | null {
  // BFS treating all relationship edges as bidirectional
  // Return the array of members in the path, or null if no path found
}
```

Display in sidebar as a visual breadcrumb:
```tsx
// [You] → Father → Grandfather → Uncle → [Target person]
// Each step is a small avatar + relation label
// "You are {target}'s grandnephew" (derive natural language from the path length/types)
```

Natural language derivation is hard — do a simplified version:
- Path length 1: show the direct relation type
- Path length 2: "Your [A]'s [B]"
- Path length 3+: "Related via {intermediate name}"

---

## Step 6 — Error boundaries + loading polish

Add a global error boundary:
```tsx
// src/components/ui/ErrorBoundary.tsx
// Catches runtime errors and shows a graceful error page
// bg-ft-bg, centred card, "Something went wrong", btn-ghost "Reload page"
```

Wrap the entire app in `<ErrorBoundary>` in `App.tsx`.

**Skeleton loading states** — replace spinners with content-aware skeletons:

Dashboard skeleton (while trees load):
```tsx
// 3 skeleton cards: bg-ft-bg3 rounded-2xl animate-pulse h-36
```

TreeView skeleton (while tree loads):
```tsx
// 5–6 skeleton node rectangles in approximate tree layout
// Staggered pulse animation: each node has a different animation delay
```

MemberPage skeleton:
```tsx
// Banner skeleton + avatar circle skeleton + field skeletons
```

Skeleton animation:
```css
/* Add to index.css */
@keyframes shimmer {
  0% { opacity: 0.5 }
  50% { opacity: 0.8 }
  100% { opacity: 0.5 }
}
.animate-shimmer { animation: shimmer 1.8s ease-in-out infinite; }
```

---

## Step 7 — Final empty states

Audit all empty states and make them visually complete:

**Dashboard — no trees:** (already built in Session 2, verify it's polished)

**TreeView — no members:** Clean illustration (SVG of a single node with dotted lines going nowhere), "Your tree is empty. Add the first member to get started."

**MemberPage — no connections:** "No connections yet. Add relationships to connect {name} to the rest of the family."

**Invite Panel — no invites yet:** "No invites sent yet. Share a link to invite family members."

---

## Step 8 — Vercel deployment

1. Push the project to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build command: `npm run build`
5. Output directory: `dist`

**Vercel config file** `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
(Required for React Router — all routes must serve `index.html`)

**Supabase Auth redirect URLs:**
In Supabase dashboard → Auth → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

---

## Step 9 — Pre-launch checklist

Run through and fix everything:

**Functionality:**
- [ ] Auth: sign up, sign in, sign out all work
- [ ] Create tree → add members → relationships wire correctly
- [ ] Dagre layout recalculates correctly when members added
- [ ] Realtime: open tree in two browser tabs, add member in one, verify it appears in the other
- [ ] Invite: generate link, open in incognito, claim, verify tree access
- [ ] Photo upload: upload, verify it appears on node and profile
- [ ] Export PNG: verify the download works
- [ ] PWA: install on mobile, verify offline read mode

**Design:**
- [ ] All screens use only ft-* colour tokens — no hardcoded whites or lights
- [ ] Cormorant Garamond loads correctly on all pages
- [ ] Mobile bottom nav works and doesn't overlap content
- [ ] Safe area insets applied (notch/home indicator on iPhone)
- [ ] Tree canvas fills full screen on desktop — no dead whitespace

**Performance:**
- [ ] Run `npm run build` — no TypeScript errors, no build warnings
- [ ] Lighthouse PWA score: aim for 90+
- [ ] Images lazy-loaded
- [ ] `npm run build` bundle size — check for unexpectedly large chunks

---

## Deliverables checklist

- [ ] `TreeSettings.tsx` — name, visibility, contributors, danger zone
- [ ] `AccountSettings.tsx` — display name, avatar
- [ ] `profiles` table + RLS in Supabase
- [ ] `usePermissions.ts` hook + applied everywhere
- [ ] GA4 wired with all 8 events tracked
- [ ] Search overlay in tree canvas
- [ ] "How are we related?" path finder in MemberSidebar
- [ ] Error boundary
- [ ] Skeleton loading states on Dashboard, TreeView, MemberPage
- [ ] All empty states polished
- [ ] `vercel.json` configured
- [ ] Supabase Auth redirect URLs set
- [ ] Pre-launch checklist all passing
- [ ] App live on Vercel
