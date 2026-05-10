# Session 7 — Photo upload, PWA config, mobile polish, export

## Context
Sessions 1–6 complete. Full invite/claim/collaborate flow works. Read CLAUDE.md before starting. This session adds photo uploads, makes the app installable as a PWA, polishes the mobile experience, and adds a tree export feature.

---

## Goals for this session

1. Photo upload for member profiles — Supabase Storage
2. PWA setup — installable on mobile home screen
3. Mobile navigation polish — bottom nav bar, gesture improvements
4. Tree export as PNG image
5. Offline read mode — view tree without internet
6. App icon and splash screen

---

## Step 1 — Supabase Storage setup

In Supabase dashboard: Storage → New bucket → `member-photos` → Public bucket.

Add storage RLS policy:
```sql
-- In Supabase dashboard SQL editor
create policy "tree members can upload photos" on storage.objects
  for insert with check (
    bucket_id = 'member-photos' and
    auth.uid() is not null
  );

create policy "anyone can view photos" on storage.objects
  for select using (bucket_id = 'member-photos');

create policy "uploader can delete their photos" on storage.objects
  for delete using (
    bucket_id = 'member-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

File path convention: `{userId}/{memberId}/{timestamp}.jpg`

---

## Step 2 — PhotoUpload component

Create `src/components/ui/PhotoUpload.tsx`:

```tsx
// Props: currentPhotoUrl, memberId, onUploadComplete
// Rendered in MemberFormModal above the name field

// UI: 80px circle
//   If photo exists: show the image
//   If no photo: gradient circle with initials + camera icon overlay on hover

// Click → hidden <input type="file" accept="image/*" />

// On file selected:
//   1. Validate: max 5MB, image/* only
//   2. Compress client-side using canvas.toBlob (resize to max 800px, quality 0.85)
//   3. Upload to Supabase Storage
//   4. Get public URL
//   5. Call onUploadComplete(url) → parent updates the member's photo_url field

// Loading state: show a spinner overlay on the avatar circle
// Error: show toast "Photo upload failed — max 5MB"
```

Client-side image compression (no library needed):
```ts
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 800
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}
```

Upload:
```ts
const compressed = await compressImage(file)
const path = `${userId}/${memberId}/${Date.now()}.jpg`
const { error } = await supabase.storage
  .from('member-photos')
  .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path)
```

---

## Step 3 — Show photos in MemberNode + ProfileHeader

**MemberNode:** If `member.photo_url` is set, show the photo in the avatar circle instead of initials. Use a proper `<img>` with `loading="lazy"` and a fallback to initials on error.

**ProfileHeader:** Same — photo takes priority over initials.

**ConnectionsGrid / pending lists / anywhere avatars appear:** Apply the same photo-first pattern consistently.

---

## Step 4 — PWA configuration

Install and configure `vite-plugin-pwa`:

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    name: 'Family Trail',
    short_name: 'FamilyTrail',
    description: 'Build your family tree together',
    theme_color: '#08060F',
    background_color: '#08060F',
    display: 'standalone',
    orientation: 'portrait-primary',
    start_url: '/',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
        handler: 'CacheFirst',
        options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
      },
    ],
  },
})
```

**App icons:** Generate `pwa-192x192.png` and `pwa-512x512.png` from the Family Trail logo SVG. Place in `public/`. Create a simple violet-background SVG icon: the tree node logo on `#08060F` background.

**Install prompt:** Show a subtle "Install app" prompt at the bottom of the Dashboard for users on mobile who haven't installed the PWA yet:

```tsx
// Use beforeinstallprompt event
// Show a dismissible card: "Install Family Trail for quick access"
// btn-primary small "Install" → calls deferredPrompt.prompt()
// Dismiss stores in localStorage: ft_install_dismissed
```

---

## Step 5 — Offline read mode

With Workbox configured, the app shell and static assets cache automatically. For tree data:

```ts
// In useTree.ts — after fetching, store in localStorage as a fallback:
const CACHE_KEY = `ft_tree_${treeId}`

// On successful fetch:
localStorage.setItem(CACHE_KEY, JSON.stringify({ members, relationships, cachedAt: Date.now() }))

// On fetch error (offline):
const cached = localStorage.getItem(CACHE_KEY)
if (cached) {
  const { members, relationships } = JSON.parse(cached)
  store.setMembers(members)
  store.setRelationships(relationships)
  // Show "offline mode" banner
}
```

**Offline banner:**
```tsx
// Use navigator.onLine + online/offline event listeners
// When offline: show a narrow amber banner at top of TreeView:
// "You're offline — viewing cached tree. Changes will sync when reconnected."
// bg-ft-gold/10 border-b border-ft-gold/20 text-ft-gold text-xs text-center py-2
```

Disable all edit/add/delete buttons when offline. Show tooltip "Not available offline" on hover.

---

## Step 6 — Tree export as PNG

Add an "Export" option in the tree toolbar (under a `...` overflow menu).

Uses `html-to-image` library:
```bash
npm install html-to-image
```

```ts
import { toPng } from 'html-to-image'

async function exportTree() {
  const canvas = document.getElementById('react-flow-canvas')
  if (!canvas) return

  // Temporarily fit view
  reactFlowInstance.fitView({ padding: 0.1 })
  await new Promise(r => setTimeout(r, 300)) // wait for animation

  const dataUrl = await toPng(canvas, {
    backgroundColor: '#08060F',
    pixelRatio: 2, // retina quality
  })

  const link = document.createElement('a')
  link.download = `${treeName.replace(/\s+/g, '_')}_family_tree.png`
  link.href = dataUrl
  link.click()
}
```

Show a toast: "Exporting tree..." → "Tree exported!" on success.

---

## Step 7 — Mobile navigation polish

**Bottom navigation bar** (mobile only, `md:hidden`):

```tsx
// Fixed bottom, bg-ft-bg2/95 backdrop-blur border-t border-ft-border
// Safe area padding: pb-[env(safe-area-inset-bottom)]
// 4 items: Home (→ /dashboard), Tree (current tree), Search (stub), Profile (→ current user's member page)
// Active item: icon + label in ft-v200, others in ft-text3
// Active indicator: small violet dot below the icon
```

**Swipe gestures:**
- On MemberSidebar (bottom sheet on mobile): drag-to-dismiss using Framer Motion `drag="y"` with `dragConstraints={{ top: 0 }}` and `onDragEnd` checking if dragged past 100px
- On InvitePanel: same pattern

**Touch-friendly node tap:**
React Flow handles touch by default. Ensure tap (not long-press) opens the sidebar. Test that pinch-to-zoom doesn't accidentally open a node.

**Keyboard avoidance:**
When the AddMemberModal is open on mobile and keyboard is shown, the modal should scroll so the active input is visible. Use `scrollIntoView` on input focus.

---

## Step 8 — Overflow menu in toolbar

Add a `...` (more options) icon button to the toolbar. Opens a small dropdown menu:

```tsx
// Options:
// • Focus on me (zoom to owner node)
// • Export as PNG
// • Tree settings (→ /tree/:id/settings — stub for Session 8)
// • Leave tree (for non-owners — shows confirmation)
```

Dropdown: `bg-ft-bg3 border border-ft-border2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-1 w-52`
Each item: `px-4 py-2.5 text-sm text-ft-text2 hover:bg-ft-border hover:text-ft-text cursor-pointer flex items-center gap-2`

---

## Deliverables checklist

- [ ] Supabase Storage bucket + RLS policies
- [ ] `PhotoUpload.tsx` — compress, upload, show
- [ ] Photos shown in MemberNode, ProfileHeader, all avatar spots
- [ ] PWA manifest + Workbox config in `vite.config.ts`
- [ ] App icons (`pwa-192x192.png`, `pwa-512x512.png`) in `public/`
- [ ] Install prompt on Dashboard mobile
- [ ] Offline banner + cached tree fallback in useTree
- [ ] Edit buttons disabled when offline
- [ ] Tree export as PNG (`html-to-image`)
- [ ] Mobile bottom navigation bar
- [ ] Drag-to-dismiss bottom sheet on mobile
- [ ] Overflow `...` menu in toolbar
- [ ] No TypeScript errors
- [ ] Test: install as PWA on Android Chrome
