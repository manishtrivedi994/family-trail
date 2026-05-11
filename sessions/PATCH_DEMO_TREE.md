# Family Trail — Patch: Live demo tree

## Project status
All 8 sessions complete. Auto-connect, spouse_of, anchor-person, and cycle
detection patches applied.

## What to build

1. A pre-seeded demo family tree in Supabase (inserted via SQL)
2. A `/demo` route that loads the tree in forced read-only mode
3. A "Sign up to build your own" conversion banner on the demo
4. Wire the "See a live demo" button on the Landing page to `/demo`

---

## Step 1 — Seed the demo tree in Supabase

Run this SQL in the Supabase dashboard SQL editor. It creates a realistic
3-generation Indian family tree that clearly shows the collaboration angle —
the owner's side in violet, the spouse's side in teal, children in gold.

The family: **Aditya Sharma** (owner) married **Priya Mehta** (spouse).
Aditya's side has 2 generations above him. Priya's side has 1 generation above.
They have 2 children together.

```sql
-- ─────────────────────────────────────────────
-- 1. Create a system demo user (no real account)
--    We use a fixed UUID so the seed is idempotent.
-- ─────────────────────────────────────────────

-- Demo tree (public, no real owner_id needed — use a sentinel UUID)
INSERT INTO trees (id, name, owner_id, visibility, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'The Sharma–Mehta Family',
  '00000000-0000-0000-0000-000000000099', -- sentinel demo user id
  'public',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. Members
-- ─────────────────────────────────────────────

-- Aditya's grandparents (paternal)
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NULL,
   'Ramesh Sharma', 'male', '1938-04-12', false,
   'Retired schoolteacher', 'Jaipur, Rajasthan',
   'Taught mathematics for 35 years at a government school in Jaipur. Known for his love of chess and morning walks.',
   '00000000-0000-0000-0000-000000000099'),

  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NULL,
   'Kamla Sharma', 'female', '1941-09-03', true,
   'Homemaker', 'Jaipur, Rajasthan',
   'Raised four children and is the heart of the Sharma family. Makes the best dal baati in Rajasthan.',
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- Aditya's parents
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NULL,
   'Vikram Sharma', 'male', '1962-11-20', true,
   'Civil engineer', 'Delhi',
   'Worked with NHAI for 30 years. Now retired and spends his time gardening and reading history books.',
   '00000000-0000-0000-0000-000000000099'),

  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', NULL,
   'Sunita Sharma', 'female', '1965-03-08', true,
   'School principal', 'Delhi',
   'Principal of a CBSE school in South Delhi for over 15 years. Passionate about education and classical music.',
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- Aditya's sibling
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', NULL,
   'Rohit Sharma', 'male', '1994-07-15', true,
   'Product designer', 'Pune',
   'Works at a fintech startup in Pune. Younger brother of Aditya. Loves motorcycles and street photography.',
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- Aditya (owner node)
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000099', -- sentinel owner
   'Aditya Sharma', 'male', '1990-03-14', true,
   'Software engineer', 'Bangalore, Karnataka',
   'Born in Delhi, grew up in Jaipur. Moved to Bangalore in 2015. Built this family tree to connect both sides of the family.',
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- Priya's parents (her side — teal)
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', NULL,
   'Suresh Mehta', 'male', '1958-06-25', true,
   'Chartered accountant', 'Mumbai',
   'Ran his own CA practice in Andheri for 25 years. Now semi-retired. Avid cricket fan — never misses a Test match.',
   '00000000-0000-0000-0000-000000000099'),

  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', NULL,
   'Anita Mehta', 'female', '1961-12-01', true,
   'Gynaecologist', 'Mumbai',
   'Senior consultant at a hospital in Mumbai. Priya credits her with being the strongest woman she knows.',
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- Priya (spouse node)
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', NULL,
   'Priya Mehta', 'female', '1992-08-22', true,
   'UX designer', 'Bangalore, Karnataka',
   'From Mumbai originally. Moved to Bangalore after marrying Aditya. Added her side of the family to complete the tree.',
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- Children (gold)
INSERT INTO members (id, tree_id, user_id, name, gender, dob, is_living, occupation, location, bio, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', NULL,
   'Ananya Sharma', 'female', '2018-02-10', true,
   NULL, 'Bangalore, Karnataka', NULL,
   '00000000-0000-0000-0000-000000000099'),

  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', NULL,
   'Arjun Sharma', 'male', '2021-11-30', true,
   NULL, 'Bangalore, Karnataka', NULL,
   '00000000-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. Relationships
-- ─────────────────────────────────────────────

INSERT INTO relationships (id, tree_id, from_id, to_id, type)
VALUES
  -- Paternal grandparents → Vikram
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'parent_of'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'parent_of'),
  -- Grandparents spouse
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'spouse_of'),

  -- Vikram + Sunita → Aditya
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', 'parent_of'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 'parent_of'),
  -- Vikram + Sunita → Rohit
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'parent_of'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'parent_of'),
  -- Vikram + Sunita spouse_of
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'spouse_of'),
  -- Aditya + Rohit sibling
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', 'sibling_of'),

  -- Priya's parents → Priya
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000009', 'parent_of'),
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009', 'parent_of'),
  -- Priya's parents spouse_of
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008', 'spouse_of'),

  -- Aditya + Priya spouse_of
  ('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000009', 'spouse_of'),

  -- Aditya + Priya → children
  ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000010', 'parent_of'),
  ('20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000010', 'parent_of'),
  ('20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000011', 'parent_of'),
  ('20000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000011', 'parent_of'),
  -- Children sibling_of
  ('20000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000011', 'sibling_of')

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. RLS — allow anyone to read the demo tree
--    (already covered by visibility='public' +
--     existing public read policy if you have one,
--     otherwise add:)
-- ─────────────────────────────────────────────

-- Allow unauthenticated reads on the demo tree only
CREATE POLICY IF NOT EXISTS "public trees are readable by anyone"
  ON trees FOR SELECT
  USING (visibility = 'public');

CREATE POLICY IF NOT EXISTS "public tree members are readable by anyone"
  ON members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = members.tree_id AND t.visibility = 'public'
    )
  );

CREATE POLICY IF NOT EXISTS "public tree relationships are readable by anyone"
  ON relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = relationships.tree_id AND t.visibility = 'public'
    )
  );
```

---

## Step 2 — Demo tree constant

Create `src/lib/demo.ts`:

```ts
export const DEMO_TREE_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_OWNER_NODE_ID = '10000000-0000-0000-0000-000000000006' // Aditya
```

---

## Step 3 — `/demo` route and DemoTreeView page

Add route in `App.tsx` — **not** wrapped in `<ProtectedRoute>`:
```tsx
<Route path="/demo" element={<DemoTreeView />} />
```

Create `src/pages/DemoTreeView.tsx`:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_TREE_ID, DEMO_OWNER_NODE_ID } from '../lib/demo'
import { useTree } from '../hooks/useTree'
import { useTreeStore } from '../store/treeStore'
import { TreeCanvas } from '../components/tree/TreeCanvas'
import { DemoBanner } from '../components/demo/DemoBanner'
import { DemoToolbar } from '../components/demo/DemoToolbar'

export function DemoTreeView() {
  // Load the demo tree exactly like a real tree
  useTree(DEMO_TREE_ID)

  const { members, relationships, loading } = useTreeStore()

  // Force owner node to Aditya so side colouring works correctly
  // (no real logged-in user — we use the demo sentinel)
  const ownerMemberId = DEMO_OWNER_NODE_ID

  if (loading) return <DemoLoadingScreen />

  return (
    <div className="flex flex-col h-screen bg-ft-bg">
      <DemoToolbar />
      <DemoBanner />  {/* conversion banner — see Step 4 */}
      <div className="flex-1 relative">
        <TreeCanvas
          treeId={DEMO_TREE_ID}
          ownerMemberId={ownerMemberId}
          readOnly={true}   // forces viewer mode regardless of auth
        />
      </div>
    </div>
  )
}
```

`readOnly` prop on `TreeCanvas` — add this prop and when true:
- Hide Add member button
- Hide edit/delete in MemberSidebar
- `nodesDraggable={false}` on ReactFlow
- `nodesConnectable={false}` on ReactFlow
- Sidebar still opens on node tap (read-only profile view)

---

## Step 4 — DemoBanner (conversion strip)

Create `src/components/demo/DemoBanner.tsx`:

```tsx
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function DemoBanner() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, type: 'spring', damping: 24 }}
      className="flex items-center justify-between gap-4 px-5 py-3
                 bg-gradient-to-r from-ft-v700/60 via-ft-v600/40 to-ft-v700/60
                 border-b border-ft-v500/20"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Sparkles className="w-4 h-4 text-ft-v200 flex-shrink-0" />
        <p className="text-sm text-ft-v100 truncate">
          You're exploring a demo tree — the Sharma–Mehta family.
          <span className="text-ft-text3 ml-1 hidden sm:inline">
            Tap any member to explore their profile.
          </span>
        </p>
      </div>
      <button
        onClick={() => navigate('/auth')}
        className="flex-shrink-0 text-sm font-semibold px-4 py-1.5 rounded-xl
                   bg-gradient-to-br from-ft-v500 to-ft-v400 text-white
                   hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,92,255,0.4)]
                   transition-all whitespace-nowrap"
      >
        Build your own →
      </button>
    </motion.div>
  )
}
```

---

## Step 5 — DemoToolbar

Create `src/components/demo/DemoToolbar.tsx`:

```tsx
// Simplified toolbar — no add/share/settings actions
// Left: logo mark + "Family Trail" wordmark
// Centre: tree name "The Sharma–Mehta Family" + "Demo" badge
// Right: single CTA button "Start for free" → /auth

export function DemoToolbar() {
  return (
    <div className="flex items-center justify-between px-4 py-2.5
                    bg-ft-bg2/90 backdrop-blur border-b border-ft-border">
      <div className="flex items-center gap-2">
        {/* Logo SVG (same as Landing page) */}
        <span className="font-display text-sm tracking-widest uppercase text-ft-text3">
          Family Trail
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-display text-base font-semibold hidden sm:block">
          Sharma–Mehta Family
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full
                         bg-ft-v500/20 text-ft-v200 border border-ft-v500/30
                         uppercase tracking-widest">
          Demo
        </span>
      </div>

      <button
        onClick={() => navigate('/auth')}
        className="text-sm font-semibold px-4 py-2 rounded-xl
                   bg-gradient-to-br from-ft-v500 to-ft-v400 text-white
                   hover:-translate-y-0.5 transition-all"
      >
        Start for free
      </button>
    </div>
  )
}
```

---

## Step 6 — Wire Landing page button

In `src/pages/Landing.tsx`, find the "See a live demo" button and update:

```tsx
// was: no onClick or a stub
// now:
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()

<button
  onClick={() => navigate('/demo')}
  className="btn-ghost"
>
  See a live demo
</button>
```

---

## Step 7 — Post-demo sign-up flow

When a visitor clicks "Build your own →" or "Start for free" from the demo,
they land on `/auth`. After signing up and completing OTP, redirect them to
`/dashboard` with a `?fromDemo=true` query param:

```ts
// In Auth.tsx, after successful OTP verify:
const fromDemo = new URLSearchParams(window.location.search).get('fromDemo')
navigate(fromDemo ? '/dashboard?fromDemo=true' : '/dashboard')
```

In `Dashboard.tsx`, detect `?fromDemo=true` and show a one-time welcome
modal instead of the standard empty state:

```tsx
// Welcome modal (Framer Motion AnimatePresence):
// font-display text-2xl "Welcome to Family Trail"
// "You just explored the Sharma–Mehta family tree. Now build your own."
// btn-primary "Create my first tree" → opens CreateTreeModal directly
// Dismiss: remove fromDemo from URL with replaceState
```

This creates a tight loop: explore demo → sign up → immediately prompted to
create their own tree. No dead ends.

---

## Files to change / create

- Supabase SQL editor — run the seed script (Step 1)
- `src/lib/demo.ts` — new file, demo constants
- `src/pages/DemoTreeView.tsx` — new file
- `src/components/demo/DemoBanner.tsx` — new file
- `src/components/demo/DemoToolbar.tsx` — new file
- `src/components/tree/TreeCanvas.tsx` — add `readOnly` prop
- `src/components/tree/MemberSidebar.tsx` — respect `readOnly` (hide edit/delete)
- `src/pages/Landing.tsx` — wire the button to `/demo`
- `src/pages/Auth.tsx` — pass `?fromDemo=true` after signup
- `src/pages/Dashboard.tsx` — fromDemo welcome modal
- `src/App.tsx` — add `/demo` route (unprotected)

---

## Testing checklist

- [ ] Landing page "See a live demo" → navigates to `/demo` without requiring login
- [ ] Demo tree loads with full Sharma–Mehta family — 3 generations, correct side colours (violet for Sharma side, teal for Mehta side, gold for children)
- [ ] Tapping any node opens the sidebar in read-only mode — no edit/delete buttons visible
- [ ] No add member button in toolbar or anywhere
- [ ] DemoBanner slides in with animation after ~0.8s delay
- [ ] "Build your own →" in banner → `/auth`
- [ ] "Start for free" in toolbar → `/auth`
- [ ] After sign-up from demo: fromDemo welcome modal appears on Dashboard
- [ ] Welcome modal "Create my first tree" → CreateTreeModal opens immediately
- [ ] Demo route works when not logged in — no auth redirect
- [ ] Demo route works when already logged in — still shows demo (not their own tree)
- [ ] Ramesh Sharma shows as deceased (dod is set, is_living: false) — verify ProfileHeader shows correctly
- [ ] Kamla Sharma age calculates correctly from dob
