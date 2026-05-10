# Session 6 — Invite system, claim flow, merge preview

## Context
Sessions 1–5 complete. Tree canvas, member profiles, and connections all work. Read CLAUDE.md before starting. This session builds the core collaborative feature — the invite and claim flow.

---

## Goals for this session

1. Build the `InvitePanel` — generate invite links, manage permissions
2. Build the `InviteClaim` page — what a recipient sees when they open a shared link
3. Implement "claim your node" — link an existing member to the recipient's account
4. Build the merge preview — show the contributor what they're joining
5. Post-claim onboarding — guide the new contributor to add their branch
6. Pending invites management in the InvitePanel

---

## Step 1 — useInvite hook

Create `src/hooks/useInvite.ts`:

```ts
export async function createInvite(treeId: string, memberId: string | null, role: 'editor' | 'viewer') {
  const { data } = await supabase
    .from('invites')
    .insert({
      tree_id: treeId,
      member_id: memberId,
      role,
      created_by: authStore.user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select().single()
  return data
}

export function getInviteUrl(token: string) {
  return `${window.location.origin}/join/${token}`
}

export async function fetchInviteByToken(token: string) {
  const { data } = await supabase
    .from('invites')
    .select(`*, trees(name, owner_id), members(name)`)
    .eq('token', token)
    .single()
  return data
}

export async function claimInvite(token: string, userId: string) {
  // 1. Get the invite
  // 2. Add user to tree_members with invite.role
  // 3. If invite.member_id is set, link that member to the user
  // 4. Mark invite as claimed
}
```

---

## Step 2 — InvitePanel

Create `src/components/invite/InvitePanel.tsx`. Opens as a right-side panel (same animation as MemberSidebar) triggered from the Share button in the toolbar.

**Tabs inside the panel:**
1. "Share link" — generate and copy link
2. "Manage" — list of existing invites

### Tab 1 — Share link

```tsx
// Header: font-display text-xl "Invite to {treeName}"
// Sub: "Share this link with a family member. They'll be able to add their branch."

// Node selector: "Who are you inviting?"
//   Dropdown/search of all members in the tree
//   Shows member name + relation
//   Optional: "Don't link to a specific person" (generic invite)

// Role selector:
//   Two large radio cards side by side:
//   [Editor] — "Can add and edit members"   (selected: violet border + bg)
//   [Viewer] — "Can only view the tree"     (selected: gold border + bg)

// Expiry: "Link expires in" → dropdown: 24 hours / 7 days / 30 days / Never

// Generate button: btn-primary "Generate invite link"
//   → calls createInvite → shows the link in a link-row box with copy button
//   → WhatsApp / Email / SMS share buttons

// After generation, show: "Link generated — share it before it expires"
```

### Tab 2 — Manage invites

Fetch all invites for this tree. Render a list:

```tsx
// Each invite:
//   Status dot (teal = accepted, gold = pending, red = expired)
//   Name of the member they were invited to claim (or "General invite")
//   Role badge
//   Claimed by email (if accepted) or "Awaiting..."
//   Expiry date
//   Revoke button (×) — only if not yet claimed
```

Revoke:
```ts
await supabase.from('invites').delete().eq('id', inviteId)
```

---

## Step 3 — InviteClaim page

`src/pages/InviteClaim.tsx` — route `/join/:token`.

This page is accessible without being logged in. Three states to handle:

### State A — Loading
Fetch the invite by token. Show a full-page dark loader.

### State B — Invalid/expired invite
```tsx
// Centred card, card-glass
// Rose/red tinted icon
// font-display text-2xl "This link has expired"
// text-ft-text2 "The invite link is no longer valid. Ask the tree owner for a new one."
// btn-ghost "Go to Family Trail"
```

### State C — Valid invite (not yet claimed)

This is the main state. Show a beautiful preview of what they're joining:

**Top section — Tree preview card:**
```tsx
// card-glass p-6 mb-6
// Tree name: font-display text-3xl "{treeName}'s family tree"
// Owner name: "Created by {ownerName}"
// Member count: "{N} members so far"
// Small visual of 3–4 member avatars overlapping (just circles with initials)
// "You're invited to join as:" → show the specific member node they're claiming (if invite.member_id is set)
//   Member name in font-display text-xl + relation chip
```

**Claim section:**
```tsx
// If user is NOT logged in:
//   "Sign in or create an account to claim your spot"
//   Email OTP form (same as Auth page — extract into a shared <EmailOTPForm /> component)
//   After auth: automatically proceed to claim

// If user IS logged in (different account already):
//   "You're signed in as {email}"
//   "Claim this invite" button

// Role badge: "You'll join as {role}"
```

### State D — Already claimed
```tsx
// "You've already joined this tree"
// btn-primary "Open family tree" → /tree/:treeId
```

---

## Step 4 — Claim logic

```ts
async function claimInvite(invite: Invite, userId: string) {
  // 1. Add to tree_members
  await supabase.from('tree_members').upsert({
    tree_id: invite.tree_id,
    user_id: userId,
    role: invite.role,
  })

  // 2. Link member node to this user (if a specific member was specified)
  if (invite.member_id) {
    await supabase
      .from('members')
      .update({ user_id: userId })
      .eq('id', invite.member_id)
  }

  // 3. Mark invite as claimed
  await supabase
    .from('invites')
    .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 4. Navigate to tree with post-claim onboarding
  navigate(`/tree/${invite.tree_id}?newMember=true`)
}
```

---

## Step 5 — Post-claim onboarding

When a new contributor opens the tree for the first time (`?newMember=true` in URL), show a one-time welcome overlay:

```tsx
// Full-canvas overlay (not modal — covers the whole tree)
// bg-ft-bg/90 backdrop-blur
// Centred card, card-glass p-8 max-w-md
// Logo mark
// font-display text-3xl "Welcome to the family tree"
// text-ft-text2 "You've been added as {memberName}. Now add your side of the family."
// Two action buttons:
//   btn-primary "Add my parents" → opens AddMemberModal with Parent pre-selected, dismisses overlay
//   btn-ghost "Explore the tree first" → dismisses overlay, opens the tree normally
// Dismiss: store in localStorage `ft_welcomed_${treeId}` so it only shows once
```

After dismissing, the tree opens normally with the new member's node highlighted (pulse animation + sidebar open).

---

## Step 6 — Share button in MemberSidebar

In `MemberSidebar.tsx`, the "Add connection" icon area — add a second action: **"Invite to claim"**. This opens the InvitePanel with this member pre-selected in the node selector.

Small affordance: if a member has `user_id === null` (unclaimed), show a subtle amber badge on their node in the canvas: a small circle indicator at top-right of the node.

```tsx
// In MemberNode.tsx:
{!member.user_id && (
  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ft-gold border-2 border-ft-bg" />
)}
```

---

## Step 7 — Tree visibility setting

In the Dashboard tree card, add a visibility indicator:
- Private: lock icon + "Private"
- Shared: link icon + "Shared via link"

In tree Settings (stub for now, full Settings in Session 8): allow changing visibility.

Also: if tree `visibility === 'public'`, the invite link should work without requiring the recipient to log in to view (but they still need an account to edit).

---

## Deliverables checklist

- [ ] `useInvite.ts` hook — create, fetch, claim, revoke
- [ ] `InvitePanel.tsx` — share link tab + manage tab
- [ ] `InviteClaim.tsx` — all 4 states (loading, invalid, valid, already claimed)
- [ ] Claim logic — tree_members insert, member user_id link, invite mark claimed
- [ ] Post-claim onboarding overlay (localStorage-gated)
- [ ] Unclaimed member dot indicator on canvas nodes
- [ ] "Invite to claim" shortcut in MemberSidebar
- [ ] Role-based UI: viewers see the canvas read-only (no add/edit/delete buttons)
- [ ] No TypeScript errors

---

## Notes

- The InviteClaim page must work without a logged-in session — don't use `<ProtectedRoute>` on `/join/:token`
- After claiming, always navigate to the tree — not the dashboard. The contributor should immediately see the tree they just joined.
- The `anyone can read invite by token` RLS policy (set in Session 2) is what makes the claim page work without auth
- Role enforcement: before showing edit buttons anywhere, check `treeStore.myRole` — add a `myRole` field to treeStore derived from tree_members
