# Session 1 — Project scaffold, design tokens, Landing & Auth pages

## Context
Starting a brand new React + TypeScript + Vite PWA called Family Trail. Read CLAUDE.md fully before starting — it contains the complete design system, colour tokens, and font setup. Every colour must use the `ft-*` Tailwind tokens. Never use white backgrounds — this is a dark-first app.

---

## Goals for this session

1. Scaffold the Vite + React + TypeScript project
2. Install and configure all dependencies
3. Set up Tailwind with the Family Trail design tokens
4. Load Google Fonts (Cormorant Garamond + Inter)
5. Build the **Landing page** — fully designed, animated
6. Build the **Auth page** — sign up / sign in with Supabase OTP (email)
7. Set up React Router with the initial route structure
8. Set up the Supabase client
9. Set up the basic Zustand auth store

---

## Step-by-step instructions

### 1. Scaffold

```bash
npm create vite@latest family-trail -- --template react-ts
cd family-trail
```

### 2. Install dependencies

```bash
npm install \
  @supabase/supabase-js \
  zustand \
  immer \
  react-router-dom \
  framer-motion \
  lucide-react \
  date-fns \
  @xyflow/react \
  @dagrejs/dagre \
  @types/dagre

npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  vite-plugin-pwa

npx tailwindcss init -p
```

### 3. tailwind.config.ts

Replace the generated config entirely with:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ft: {
          bg:      '#08060F',
          bg2:     '#100D1E',
          bg3:     '#17132B',
          bg4:     '#1F1A38',
          border:  'rgba(160,130,255,0.12)',
          border2: 'rgba(160,130,255,0.22)',
          border3: 'rgba(160,130,255,0.40)',
          v50:  '#F3F0FF',
          v100: '#DDD5FF',
          v200: '#C4B5FD',
          v400: '#9B7AFF',
          v500: '#7C5CFF',
          v600: '#6344E0',
          v700: '#4B30B8',
          teal: '#2DD4BF',
          gold: '#D4A843',
          rose: '#E879A0',
          text:  '#EDE9FF',
          text2: 'rgba(237,233,255,0.6)',
          text3: 'rgba(237,233,255,0.3)',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
```

### 4. index.html — add Google Fonts

In `<head>`, add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<title>Family Trail</title>
```

### 5. src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-ft-bg text-ft-text font-sans antialiased;
  }
  * {
    @apply border-ft-border;
  }
}

@layer utilities {
  .gradient-text {
    background: linear-gradient(135deg, #C4B5FD 0%, #9B7AFF 50%, #D4A843 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .btn-primary {
    @apply bg-gradient-to-br from-ft-v500 to-ft-v400 text-white font-semibold rounded-2xl px-8 py-3.5
           hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,92,255,0.45)] transition-all duration-200;
  }
  .btn-ghost {
    @apply border border-ft-border2 text-ft-v200 rounded-2xl px-8 py-3.5
           hover:bg-ft-border hover:border-ft-border3 transition-all duration-200;
  }
  .card-glass {
    @apply bg-ft-bg3 border border-ft-border rounded-2xl;
  }
}
```

### 6. src/lib/supabase.ts

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 7. src/store/authStore.ts

```ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  immer((set) => ({
    user: null,
    session: null,
    loading: true,
    setSession: (session) => {
      set((state) => {
        state.session = session
        state.user = session?.user ?? null
        state.loading = false
      })
    },
    signOut: async () => {
      await supabase.auth.signOut()
      set((state) => {
        state.user = null
        state.session = null
      })
    },
  }))
)
```

### 8. React Router — src/App.tsx

Set up routes:
- `/` → `<Landing />`
- `/auth` → `<Auth />`
- `/dashboard` → `<Dashboard />` (stub for now — just a dark page with "Coming in Session 2")
- `/join/:token` → `<InviteClaim />` (stub)

Wrap with a Supabase auth listener in `useEffect` that calls `authStore.setSession` on session changes and redirects to `/dashboard` if already logged in.

### 9. Landing page — src/pages/Landing.tsx

Build the full Landing page as designed. Key sections:

**Hero section:**
- Full viewport height, dark `bg-ft-bg`
- Three animated orbs using Framer Motion (`animate={{ scale: [1, 1.2, 1], opacity: [0.18, 0.28, 0.18] }}` with `repeat: Infinity` and staggered `delay`)
- Logo SVG (tree node graph — circle at top, two children below, lines connecting them)
- Wordmark: `font-display text-sm tracking-[0.25em] uppercase text-ft-text3` — "Family Trail"
- Headline: `font-display text-5xl md:text-6xl font-bold` — "Where every branch tells its *own story*" — the italic words use `.gradient-text` utility
- Sub copy: `font-light text-ft-text2 text-base md:text-lg max-w-md leading-relaxed`
- Two CTAs: `.btn-primary` "Start your tree" (→ `/auth`) and `.btn-ghost` "See a live demo"
- Trust stats row: 3 numbers (4.2k Trees, 18k Members, 3.1k Families) separated by vertical dividers. Numbers in `font-display text-3xl text-ft-v200`

**Feature strip** (below hero, `border-t border-ft-border`):
Four equal columns, each with a Lucide icon (`text-ft-v400`), a label, and a sub-label. Features: Distributed building / Invite & merge / Privacy first / Any device.

Framer Motion entrance animations:
- Orbs: continuous pulse (scale + opacity loop)
- Hero text: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}` with stagger between wordmark, headline, sub, CTAs
- Feature strip items: staggered fade-up on scroll (`whileInView`)

Desktop layout: content is centred with `max-w-2xl mx-auto`. The dark background fills the full width so there is no whitespace problem — the orbs bleed to the edges.

### 10. Auth page — src/pages/Auth.tsx

OTP-based email auth (same pattern as Job Trail). Two steps:

**Step 1 — Email entry:**
- Card: `card-glass p-8 w-full max-w-sm mx-auto mt-24`
- Logo + "Family Trail" wordmark at top
- Heading: `font-display text-2xl` — "Welcome back" / "Create your account"
- Toggle: sign in / sign up (subtle text link toggle, not tabs)
- Email input: dark styled — `bg-ft-bg2 border border-ft-border2 text-ft-text rounded-xl px-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors`
- CTA: `.btn-primary w-full` — "Send magic link"
- Call `supabase.auth.signInWithOtp({ email })` for both sign in and sign up

**Step 2 — OTP entry (after email sent):**
- Same card, animated transition with Framer Motion `AnimatePresence`
- 6-digit OTP input (single `<input maxLength={6}`) — same dark styling
- "Check your email for a 6-digit code"
- Call `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- On success: redirect to `/dashboard`
- "Back" link to return to step 1

Background: same orb animation as Landing (extract orbs into a shared `<AnimatedOrbs />` component used on both Landing and Auth).

---

## Deliverables checklist

- [ ] Project scaffolded and running (`npm run dev`)
- [ ] Tailwind config with all `ft-*` tokens
- [ ] Google Fonts loaded (Cormorant Garamond + Inter)
- [ ] `supabase.ts` client configured
- [ ] `authStore.ts` with session handling
- [ ] React Router set up with all routes
- [ ] Landing page — hero + feature strip, animated orbs, gradient headline
- [ ] Auth page — email OTP flow, both steps, animated transition
- [ ] `.env` file with placeholder Supabase keys and instructions
- [ ] No TypeScript errors (`npm run build` clean)

---

## Important reminders

- Every background must use `ft-bg`, `ft-bg2`, `ft-bg3`, or `ft-bg4` — never white or light colours
- All text colours via `ft-text`, `ft-text2`, `ft-text3` — never hardcoded
- Primary accent is always violet (`ft-v400`/`ft-v500`) — reserve teal for spouse-side, gold for children
- Cormorant Garamond (`font-display`) for headings and names only — Inter (`font-sans`) for everything else
- Mobile-first — all layouts stack vertically on mobile, use `md:` breakpoint for desktop layouts
- The orb animation uses Framer Motion, not CSS keyframes — keep it consistent
