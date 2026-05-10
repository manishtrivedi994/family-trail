# Session 2 — Supabase schema, RLS, auth wiring, Dashboard

## Context
Session 1 is complete. The project is scaffolded with Tailwind ft-* tokens, Google Fonts, Landing page, Auth page with OTP flow, Supabase client, and authStore. Read CLAUDE.md fully before starting.

---

## Goals for this session

1. Create all Supabase tables in the remote project
2. Write and apply all Row Level Security (RLS) policies
3. Wire the auth session listener so the app redirects correctly on login/logout
4. Build a protected route wrapper component
5. Build the **Dashboard page** — list of the user's trees with create option

---

## Step 1 — Supabase migrations

Create `supabase/migrations/001_initial_schema.sql`. Run it via the Supabase dashboard SQL editor or CLI.

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Trees
create table trees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private','shared','public')),
  created_at timestamptz not null default now()
);

-- Members (nodes in the graph)
create table members (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  gender text check (gender in ('male','female','other')),
  dob date,
  dod date,
  photo_url text,
  bio text,
  occupation text,
  location text,
  is_living boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Relationships (edges in the graph)
create table relationships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  from_id uuid not null references members(id) on delete cascade,
  to_id uuid not null references members(id) on delete cascade,
  type text not null check (type in ('parent_of','spouse_of','sibling_of')),
  created_at timestamptz not null default now(),
  unique(from_id, to_id, type)
);

-- Invites (share links)
create table invites (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  token text unique not null default encode(gen_random_bytes(8), 'hex'),
  role text not null default 'editor' check (role in ('editor','viewer')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

-- Tree members ACL
create table tree_members (
  tree_id uuid not null references trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

-- Indexes
create index on members(tree_id);
create index on relationships(tree_id);
create index on tree_members(user_id);
create index on invites(token);
```

---

## Step 2 — RLS policies

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS on all tables
alter table trees enable row level security;
alter table members enable row level security;
alter table relationships enable row level security;
alter table invites enable row level security;
alter table tree_members enable row level security;

-- Helper function: check if current user is a member of a tree
create or replace function is_tree_member(tid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from tree_members
    where tree_id = tid and user_id = auth.uid()
  );
$$;

-- Helper function: check if current user has editor+ role on a tree
create or replace function is_tree_editor(tid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from tree_members
    where tree_id = tid and user_id = auth.uid() and role in ('owner','editor')
  );
$$;

-- Trees policies
create policy "users can read their trees" on trees
  for select using (is_tree_member(id));

create policy "users can create trees" on trees
  for insert with check (auth.uid() = owner_id);

create policy "owners can update their trees" on trees
  for update using (auth.uid() = owner_id);

create policy "owners can delete their trees" on trees
  for delete using (auth.uid() = owner_id);

-- Members policies
create policy "tree members can read members" on members
  for select using (is_tree_member(tree_id));

create policy "tree editors can insert members" on members
  for insert with check (is_tree_editor(tree_id));

create policy "tree editors can update members" on members
  for update using (is_tree_editor(tree_id));

create policy "tree owners can delete members" on members
  for delete using (
    exists (select 1 from tree_members where tree_id = members.tree_id and user_id = auth.uid() and role = 'owner')
  );

-- Relationships policies
create policy "tree members can read relationships" on relationships
  for select using (is_tree_member(tree_id));

create policy "tree editors can manage relationships" on relationships
  for all using (is_tree_editor(tree_id));

-- Invites policies
create policy "tree members can read invites" on invites
  for select using (is_tree_member(tree_id));

create policy "tree editors can create invites" on invites
  for insert with check (is_tree_editor(tree_id));

-- Allow unauthenticated read of invite by token (for claim page)
create policy "anyone can read invite by token" on invites
  for select using (true);

-- Tree members policies
create policy "tree members can read acl" on tree_members
  for select using (is_tree_member(tree_id));

create policy "owners can manage acl" on tree_members
  for all using (
    exists (select 1 from tree_members tm where tm.tree_id = tree_members.tree_id and tm.user_id = auth.uid() and tm.role = 'owner')
  );

-- Allow insert for new members joining (via invite claim)
create policy "users can add themselves to trees" on tree_members
  for insert with check (auth.uid() = user_id);
```

---

## Step 3 — Types

Create `src/types/index.ts`:

```ts
export type TreeVisibility = 'private' | 'shared' | 'public'
export type MemberRole = 'owner' | 'editor' | 'viewer'
export type RelationshipType = 'parent_of' | 'spouse_of' | 'sibling_of'
export type MemberSide = 'owner' | 'ancestor' | 'spouse' | 'child' | 'unknown'

export interface Tree {
  id: string
  name: string
  owner_id: string
  visibility: TreeVisibility
  created_at: string
  // joined fields
  member_count?: number
  my_role?: MemberRole
}

export interface Member {
  id: string
  tree_id: string
  user_id: string | null
  name: string
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  dod: string | null
  photo_url: string | null
  bio: string | null
  occupation: string | null
  location: string | null
  is_living: boolean
  created_by: string
  created_at: string
}

export interface Relationship {
  id: string
  tree_id: string
  from_id: string
  to_id: string
  type: RelationshipType
  created_at: string
}

export interface Invite {
  id: string
  tree_id: string
  member_id: string | null
  token: string
  role: MemberRole
  created_by: string
  expires_at: string | null
  claimed_by: string | null
  claimed_at: string | null
}

export interface TreeMember {
  tree_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}
```

---

## Step 4 — Auth session wiring in App.tsx

Update `App.tsx` to properly listen for auth changes:

```tsx
useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setSession(session)
  })

  // Listen for changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session)
  })

  return () => subscription.unsubscribe()
}, [])
```

---

## Step 5 — Protected route component

Create `src/components/ui/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ft-v400 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}
```

Wrap `/dashboard` and all future protected routes with `<ProtectedRoute>` in `App.tsx`.

---

## Step 6 — Dashboard page

Create `src/pages/Dashboard.tsx`. This is the home screen after login — shows the user's trees.

### Layout
Full dark page, `bg-ft-bg`, no max-width constraint for the background. Content centred at `max-w-5xl mx-auto px-6 py-10`.

### Top bar
```tsx
// Sticky top bar — bg-ft-bg2/80 backdrop-blur border-b border-ft-border
// Left: Logo SVG + "Family Trail" wordmark (font-display text-sm tracking-widest uppercase text-ft-text3)
// Right: Avatar circle (initials from user email) + sign out icon button
```

Avatar circle: `w-9 h-9 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center text-white text-sm font-semibold`

### Page header
```
font-display text-4xl font-bold text-ft-text mb-1 — "Your family trees"
text-ft-text2 text-sm — "Build your legacy, together"
```

### Tree grid
Fetch trees the user belongs to:
```ts
// src/hooks/useTrees.ts
const { data } = await supabase
  .from('tree_members')
  .select(`
    role,
    trees (
      id, name, owner_id, visibility, created_at
    )
  `)
  .eq('user_id', user.id)
```

Display as a responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`

**Tree card** (`card-glass p-5 hover:border-ft-border2 transition-colors cursor-pointer group`):
- Top: tree icon (Lucide `<GitBranch>` in a small rounded square `bg-ft-bg4 p-2 rounded-xl text-ft-v400`) + role badge (owner/editor/viewer)
- Tree name: `font-display text-xl font-semibold mt-3 group-hover:text-ft-v200 transition-colors`
- Meta row: created date + member count placeholder (`text-ft-text3 text-sm`)
- Bottom: "Open tree →" link in `text-ft-v400 text-sm font-medium`
- On click: navigate to `/tree/:id`

Role badge colours:
- owner → `bg-ft-v500/20 text-ft-v200 border border-ft-v500/30`
- editor → `bg-ft-teal/10 text-ft-teal border border-ft-teal/20`
- viewer → `bg-ft-gold/10 text-ft-gold border border-ft-gold/20`

### Empty state
When no trees yet:
```tsx
// Centred empty state card (card-glass p-12 text-center max-w-md mx-auto mt-16)
// Large tree icon in a gradient circle
// font-display text-2xl "Your story starts here"
// text-ft-text2 text-sm "Create your first family tree and invite your relatives to join"
// btn-primary "Create your first tree"
```

### Create tree modal
Triggered by a floating `+` button (bottom-right on mobile, or a "New tree" button in the top bar on desktop).

Modal structure (use Framer Motion `AnimatePresence` for entrance):
```tsx
// Backdrop: fixed inset-0 bg-black/60 backdrop-blur-sm
// Panel: bg-ft-bg2 border border-ft-border2 rounded-3xl p-6 w-full max-w-md mx-auto mt-32
// Title: font-display text-2xl "Name your family tree"
// Input: tree name (e.g. "The Sharma Family")
// Optional: visibility toggle (private / shared)
// Actions: Cancel (btn-ghost) + "Create tree" (btn-primary)
```

On submit:
```ts
// 1. Insert into trees
const { data: tree } = await supabase
  .from('trees')
  .insert({ name, owner_id: user.id })
  .select().single()

// 2. Insert owner into tree_members
await supabase
  .from('tree_members')
  .insert({ tree_id: tree.id, user_id: user.id, role: 'owner' })

// 3. Navigate to /tree/:id
navigate(`/tree/${tree.id}`)
```

---

## Step 7 — TreeView page stub

Create `src/pages/TreeView.tsx` as a stub — just the top bar and a centred "Tree canvas coming in Session 3" message on the dark background. This page is needed so the Dashboard "Open tree" links don't 404.

---

## Deliverables checklist

- [ ] SQL migrations written (`001_initial_schema.sql`, `002_rls_policies.sql`)
- [ ] All 5 tables created in Supabase
- [ ] RLS policies applied and verified
- [ ] `src/types/index.ts` with all interfaces
- [ ] Auth session listener wired in App.tsx
- [ ] `ProtectedRoute` component
- [ ] `useTrees` hook
- [ ] Dashboard page — top bar, tree grid, empty state, create modal
- [ ] TreeView stub page
- [ ] No TypeScript errors

---

## Notes

- Run migrations in the Supabase dashboard SQL editor (Project → SQL Editor → New query)
- After creating a tree, the owner is also inserted into `tree_members` with role `owner` — this is how RLS works
- The `is_tree_member` helper function is `security definer` so it can bypass RLS to check membership
