import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Mail, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AnimatedOrbs } from '../components/ui/AnimatedOrbs'
import { LogoMark } from '../components/ui/LogoMark'

type Step = 'email' | 'otp'
type Mode = 'signin' | 'signup'

const slide = {
  enter:  { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: -24 },
}


export function Auth() {
  const navigate = useNavigate()
  const [mode, setMode]   = useState<Mode>('signin')
  const [step, setStep]   = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setStep('otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
      if (error) throw error
      if (data.user) navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ft-bg flex items-center justify-center px-4 relative overflow-hidden">
      <AnimatedOrbs />

      <div className="relative z-10 w-full max-w-sm">
        <div className="card-glass p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <LogoMark size={28} />
            <span className="font-display text-sm tracking-[0.25em] uppercase text-ft-text3">
              Family Trail
            </span>
          </div>

          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.form
                key="email"
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                onSubmit={handleSendOtp}
                className="flex flex-col gap-5"
              >
                <div>
                  <h1 className="font-display text-2xl font-bold text-ft-text">
                    {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                  </h1>
                  <p className="text-ft-text3 text-sm mt-1">
                    {mode === 'signin' ? "Don't have an account? " : 'Already have one? '}
                    <button
                      type="button"
                      className="text-ft-v400 hover:text-ft-v200 transition-colors"
                      onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    >
                      {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>

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

                {error && <p className="text-ft-rose text-xs">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full text-center">
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                onSubmit={handleVerifyOtp}
                className="flex flex-col gap-5"
              >
                <div>
                  <h1 className="font-display text-2xl font-bold text-ft-text">Check your email</h1>
                  <p className="text-ft-text2 text-sm mt-1 leading-relaxed">
                    We sent a 6-digit code to <span className="text-ft-v200">{email}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
                    6-digit code
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="bg-ft-bg2 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm tracking-widest"
                    />
                  </div>
                </div>

                {error && <p className="text-ft-rose text-xs">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full text-center">
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  className="flex items-center gap-1.5 text-ft-text3 hover:text-ft-text2 text-sm transition-colors mx-auto"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
