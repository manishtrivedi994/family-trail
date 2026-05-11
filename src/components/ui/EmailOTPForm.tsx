import { useState } from 'react'
import { Mail, Lock, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface EmailOTPFormProps {
  onSuccess: (userId: string) => void
  redirectTo?: string
}

type Mode = 'signin' | 'signup'

export function EmailOTPForm({ onSuccess }: EmailOTPFormProps) {
  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) onSuccess(data.user.id)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: name.trim() ? { data: { full_name: name.trim() } } : undefined,
        })
        if (error) throw error
        if (data.user) onSuccess(data.user.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-ft-text3 text-xs">
        {mode === 'signin' ? "Don't have an account? " : 'Already have one? '}
        <button
          type="button"
          className="text-ft-v400 hover:text-ft-v200 transition-colors"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>

      {mode === 'signup' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
            Your name <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Manish Trivedi"
              className="bg-ft-bg3 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
          Email address
        </label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-ft-bg3 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
          Password
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-ft-bg3 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-ft-rose text-xs">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full text-center">
        {loading
          ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
          : (mode === 'signin' ? 'Sign in' : 'Create account')}
      </button>
    </form>
  )
}
