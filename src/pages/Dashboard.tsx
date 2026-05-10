import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Cake, Download, GitBranch, LogOut, Plus, Settings, X, Lock, Globe, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useTrees } from '../hooks/useTrees'
import { trackEvent } from '../lib/analytics'
import type { Member, Tree, MemberRole, TreeVisibility } from '../types'
import { format, parseISO, differenceInDays, differenceInYears, startOfDay } from 'date-fns'
import { LogoMark } from '../components/ui/LogoMark'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const roleStyles: Record<MemberRole, string> = {
  owner: 'bg-ft-v500/20 text-ft-v200 border border-ft-v500/30',
  editor: 'bg-ft-teal/10 text-ft-teal border border-ft-teal/20',
  viewer: 'bg-ft-gold/10 text-ft-gold border border-ft-gold/20',
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 320 } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
}

function TopBar() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const initials = (user?.email ?? 'U').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 bg-ft-bg2/80 backdrop-blur border-b border-ft-border">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={22} />
          <span className="font-display text-sm tracking-widest uppercase text-ft-text3">Family Trail</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-xl text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            aria-label="Account settings"
          >
            <Settings size={16} />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center text-white text-sm font-semibold select-none">
            {initials}
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-xl text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

function TreeCardSkeleton() {
  return (
    <div className="card-glass p-5 animate-shimmer">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-ft-bg4" />
        <div className="w-14 h-5 rounded-full bg-ft-bg4" />
      </div>
      <div className="h-6 w-3/4 bg-ft-bg4 rounded-lg mt-3" />
      <div className="h-4 w-1/2 bg-ft-bg4 rounded-lg mt-2" />
      <div className="h-4 w-1/3 bg-ft-bg4 rounded-lg mt-4" />
    </div>
  )
}

function TreeCard({ tree, onClick }: { tree: Tree; onClick: () => void }) {
  const role = tree.my_role ?? 'viewer'
  const visIcon = tree.visibility === 'public' ? <Globe size={12} /> : tree.visibility === 'shared' ? <Users size={12} /> : <Lock size={12} />

  return (
    <button
      onClick={onClick}
      className="card-glass p-5 hover:border-ft-border2 transition-colors cursor-pointer group text-left w-full"
    >
      <div className="flex items-start justify-between">
        <div className="bg-ft-bg4 p-2 rounded-xl text-ft-v400">
          <GitBranch size={18} />
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${roleStyles[role]}`}>
          {role}
        </span>
      </div>
      <p className="font-display text-xl font-semibold mt-3 text-ft-text group-hover:text-ft-v200 transition-colors">
        {tree.name}
      </p>
      <div className="flex items-center gap-1.5 mt-1 text-ft-text3 text-sm">
        <span className="flex items-center gap-1">{visIcon} {tree.visibility}</span>
        <span className="opacity-40">·</span>
        <span>{format(new Date(tree.created_at), 'MMM d, yyyy')}</span>
      </div>
      <p className="mt-4 text-ft-v400 text-sm font-medium">Open tree →</p>
    </button>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="card-glass p-12 text-center max-w-md mx-auto mt-16">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center mx-auto mb-5">
        <GitBranch size={28} className="text-white" />
      </div>
      <p className="font-display text-2xl font-bold text-ft-text mb-2">Your story starts here</p>
      <p className="text-ft-text2 text-sm mb-6">
        Create your first family tree and invite your relatives to join
      </p>
      <button onClick={onCreateClick} className="btn-primary w-full">
        Create your first tree
      </button>
    </div>
  )
}

function CreateTreeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState<TreeVisibility>('private')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: tree, error: treeErr } = await supabase
        .from('trees')
        .insert({ name: name.trim(), owner_id: user.id, visibility })
        .select()
        .single()
      if (treeErr) throw treeErr

      const { error: memberErr } = await supabase
        .from('tree_members')
        .insert({ tree_id: tree.id, user_id: user.id, role: 'owner' })
      if (memberErr) throw memberErr

      trackEvent('tree_created', { tree_id: tree.id })
      onCreated(tree.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tree')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-ft-bg2 border border-ft-border2 rounded-3xl p-6 w-full max-w-md mt-32"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-bold text-ft-text">Name your family tree</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium block mb-1.5">
              Tree name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Sharma Family"
              className="w-full bg-ft-bg3 border border-ft-border rounded-xl px-4 py-3 text-ft-text placeholder:text-ft-text3 focus:outline-none focus:border-ft-border3 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium block mb-1.5">
              Visibility
            </label>
            <div className="flex gap-2">
              {(['private', 'shared', 'public'] as TreeVisibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                    visibility === v
                      ? 'bg-ft-v500/30 text-ft-v200 border border-ft-v500/40'
                      : 'bg-ft-bg4 text-ft-text3 border border-ft-border hover:border-ft-border2'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-ft-rose text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-3 px-4">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="btn-primary flex-1 py-3 px-4 disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Creating…' : 'Create tree'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

interface UpcomingBirthday extends Member {
  treeName: string
  daysUntil: number
  turnsAge: number
}

const badgeColor = (days: number) =>
  days <= 7
    ? 'bg-ft-rose/15 text-ft-rose border border-ft-rose/25'
    : days <= 14
    ? 'bg-ft-gold/15 text-ft-gold border border-ft-gold/25'
    : 'bg-ft-v500/15 text-ft-v200 border border-ft-v500/25'

function BirthdaysWidget({ birthdays }: { birthdays: UpcomingBirthday[] }) {
  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="card-glass p-5">
      <div className="flex items-center gap-2 mb-1">
        <Cake size={16} className="text-ft-v400" />
        <h2 className="font-display text-xl font-semibold text-ft-text">Coming up</h2>
      </div>
      <p className="text-ft-text3 text-sm mb-4">Birthdays in the next 30 days</p>

      {birthdays.length === 0 ? (
        <p className="text-sm text-ft-text3 text-center py-4">
          No upcoming birthdays — add birth dates to your family members
        </p>
      ) : (
        <div className="space-y-2.5">
          {birthdays.map((b) => (
            <div
              key={`${b.id}-${b.treeName}`}
              className="flex items-center gap-3 p-3 bg-ft-bg3 border border-ft-border rounded-2xl"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials(b.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ft-text truncate">{b.name}</p>
                <p className="text-[11px] text-ft-text3">
                  {b.daysUntil === 0
                    ? `Turns ${b.turnsAge} today 🎂`
                    : `Turns ${b.turnsAge} on ${format(parseISO(b.dob!), 'MMM d')}`}
                  {' · '}
                  <span className="text-ft-text3">{b.treeName}</span>
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeColor(b.daysUntil)}`}>
                {b.daysUntil === 0 ? 'Today' : `${b.daysUntil}d`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-6 mt-4 flex items-center gap-3 bg-ft-bg3 border border-ft-border2 rounded-2xl px-4 py-3"
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center shrink-0">
        <Download size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ft-text">Install Family Trail</p>
        <p className="text-xs text-ft-text3">Add to your home screen for quick access</p>
      </div>
      <button
        onClick={onInstall}
        className="px-3 py-1.5 rounded-xl bg-ft-v500 text-white text-xs font-semibold hover:bg-ft-v600 transition-colors shrink-0"
      >
        Install
      </button>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-ft-text3 hover:text-ft-text hover:bg-ft-bg4 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { trees, loading, error } = useTrees()
  const { user } = useAuthStore()
  const [showModal, setShowModal] = useState(false)
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([])
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('ft_install_dismissed')
    if (dismissed) return
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') setShowInstallBanner(false)
    deferredPrompt.current = null
  }

  function handleDismissInstall() {
    localStorage.setItem('ft_install_dismissed', '1')
    setShowInstallBanner(false)
  }

  useEffect(() => {
    if (!user || trees.length === 0) return
    let cancelled = false

    async function loadBirthdays() {
      const treeIds = trees.map((t) => t.id)
      const { data } = await supabase
        .from('members')
        .select('*')
        .in('tree_id', treeIds)
        .not('dob', 'is', null)

      if (cancelled) return

      const today = startOfDay(new Date())
      const upcoming: UpcomingBirthday[] = ((data ?? []) as Member[])
        .map((m) => {
          const dob = parseISO(m.dob!)
          const thisYear = today.getFullYear()
          const thisYearBirthday = new Date(thisYear, dob.getMonth(), dob.getDate())
          const nextBirthday =
            thisYearBirthday >= today
              ? thisYearBirthday
              : new Date(thisYear + 1, dob.getMonth(), dob.getDate())
          const daysUntil = differenceInDays(nextBirthday, today)
          const turnsAge = differenceInYears(nextBirthday, dob)
          const tree = trees.find((t) => t.id === m.tree_id)
          return { ...m, treeName: tree?.name ?? '', daysUntil, turnsAge }
        })
        .filter((m) => m.daysUntil >= 0 && m.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)

      setBirthdays(upcoming)
    }

    loadBirthdays()
    return () => { cancelled = true }
  }, [trees, user])

  function handleCreated(id: string) {
    setShowModal(false)
    navigate(`/tree/${id}`)
  }

  return (
    <div className="min-h-screen bg-ft-bg">
      <TopBar />

      <AnimatePresence>
        {showInstallBanner && (
          <div className="max-w-5xl mx-auto md:hidden">
            <InstallBanner onInstall={handleInstall} onDismiss={handleDismissInstall} />
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-ft-text mb-1">Your family trees</h1>
            <p className="text-ft-text2 text-sm">Build your legacy, together</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 py-2.5 px-5"
          >
            <Plus size={16} />
            New tree
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <TreeCardSkeleton />
            <TreeCardSkeleton />
            <TreeCardSkeleton />
          </div>
        )}

        {error && (
          <p className="text-ft-rose text-sm text-center mt-8">{error}</p>
        )}

        {!loading && !error && trees.length === 0 && (
          <EmptyState onCreateClick={() => setShowModal(true)} />
        )}

        {!loading && trees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trees.map((tree) => (
              <TreeCard
                key={tree.id}
                tree={tree}
                onClick={() => navigate(`/tree/${tree.id}`)}
              />
            ))}
          </div>
        )}

        {!loading && trees.length > 0 && (
          <div className="mt-10">
            <BirthdaysWidget birthdays={birthdays} />
          </div>
        )}
      </main>

      <AnimatePresence>
        {showModal && (
          <CreateTreeModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
        )}
      </AnimatePresence>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 rounded-full bg-gradient-to-br from-ft-v500 to-ft-v400 flex items-center justify-center shadow-[0_8px_24px_rgba(124,92,255,0.5)] text-white"
        aria-label="Create tree"
      >
        <Plus size={22} />
      </button>
    </div>
  )
}
