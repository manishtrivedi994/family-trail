import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Mail, Lock, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Mode = 'signin' | 'signup'

interface Props {
  onClose: () => void
  fromDemo?: boolean
}

const backdrop = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
}

const panel = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  show:   { opacity: 1, scale: 1,    y: 0 },
}

export function AuthModal({ onClose, fromDemo }: Props) {
  const navigate = useNavigate()
  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: name.trim() ? { data: { full_name: name.trim() } } : undefined,
        })
        if (error) throw error
      }
      navigate(fromDemo ? '/dashboard?fromDemo=true' : '/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        variants={backdrop}
        initial="hidden"
        animate="show"
        exit="hidden"
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(8,6,15,0.82)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          key="panel"
          variants={panel}
          initial="hidden"
          animate="show"
          exit="hidden"
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-glass p-8">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-ft-text3 hover:text-ft-text2 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-7">
              <h2 className="font-display text-2xl font-bold text-ft-text">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-ft-text3 text-sm mt-1">
                {mode === 'signin' ? "Don't have an account? " : 'Already have one? '}
                <button
                  type="button"
                  className="text-ft-v400 hover:text-ft-v200 transition-colors"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Name — signup only */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5 pb-0.5">
                      <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
                        Your name <span className="text-ft-text3 normal-case tracking-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Manish Trivedi"
                          className="bg-ft-bg2 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-ft-bg2 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-ft-bg2 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm"
                  />
                </div>
              </div>

              {error && <p className="text-ft-rose text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center mt-1"
              >
                {loading
                  ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                  : (mode === 'signin' ? 'Sign in' : 'Create account')}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
