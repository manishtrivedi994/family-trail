import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface EmailOTPFormProps {
  onSuccess: (userId: string) => void
}

const slide = {
  enter:  { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: -20 },
}

export function EmailOTPForm({ onSuccess }: EmailOTPFormProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setStep('otp')
    } catch (err) {
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
      if (data.user) onSuccess(data.user.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {step === 'email' ? (
        <motion.form
          key="email"
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
          onSubmit={handleSendOtp}
          className="flex flex-col gap-4"
        >
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
          transition={{ duration: 0.2 }}
          onSubmit={handleVerifyOtp}
          className="flex flex-col gap-4"
        >
          <p className="text-ft-text2 text-sm leading-relaxed">
            We sent a 6-digit code to <span className="text-ft-v200">{email}</span>
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium">
              6-digit code
            </label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ft-text3" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="bg-ft-bg3 border border-ft-border2 text-ft-text rounded-xl pl-10 pr-4 py-3 w-full focus:border-ft-v400 focus:outline-none transition-colors placeholder:text-ft-text3 text-sm tracking-widest"
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
            <ArrowLeft size={13} />
            Back
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
