import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GitBranch, Users, Shield, Smartphone } from 'lucide-react'
import { AnimatedOrbs } from '../components/ui/AnimatedOrbs'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const features = [
  {
    icon: GitBranch,
    label: 'Distributed building',
    sub: 'Each person adds their own branch',
  },
  {
    icon: Users,
    label: 'Invite & merge',
    sub: 'Trees join at shared members',
  },
  {
    icon: Shield,
    label: 'Privacy first',
    sub: 'You control who sees your tree',
  },
  {
    icon: Smartphone,
    label: 'Any device',
    sub: 'Works offline as a PWA',
  },
]

const stats = [
  { value: '4.2k', label: 'Trees' },
  { value: '18k',  label: 'Members' },
  { value: '3.1k', label: 'Families' },
]

function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="8" r="5" fill="rgba(155,122,255,0.9)" />
      <circle cx="8"  cy="28" r="4" fill="rgba(45,212,191,0.8)" />
      <circle cx="28" cy="28" r="4" fill="rgba(212,168,67,0.8)" />
      <line x1="18" y1="13" x2="8"  y2="24" stroke="rgba(155,122,255,0.3)" strokeWidth="1.5" />
      <line x1="18" y1="13" x2="28" y2="24" stroke="rgba(155,122,255,0.3)" strokeWidth="1.5" />
    </svg>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen bg-ft-bg relative overflow-hidden">
      <AnimatedOrbs />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-6 max-w-2xl mx-auto"
        >
          {/* Logo + wordmark */}
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <LogoMark />
            <span className="font-display text-sm tracking-[0.25em] uppercase text-ft-text3">
              Family Trail
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl md:text-6xl font-bold text-ft-text leading-tight"
          >
            Where every branch tells its{' '}
            <em className="gradient-text not-italic">own story</em>
          </motion.h1>

          {/* Sub copy */}
          <motion.p
            variants={fadeUp}
            className="font-light text-ft-text2 text-base md:text-lg max-w-md leading-relaxed"
          >
            Invite your relatives to build their side of the tree. Family Trail
            merges everything together into one living, collaborative family history.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link to="/auth" className="btn-primary">
              Start your tree
            </Link>
            <button className="btn-ghost">See a live demo</button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-8 mt-6 pt-6 border-t border-ft-border w-full justify-center"
          >
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-8">
                <div className="text-center">
                  <div className="font-display text-3xl font-bold text-ft-v200">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium mt-0.5">
                    {stat.label}
                  </div>
                </div>
                {i < stats.length - 1 && (
                  <div className="h-8 w-px bg-ft-border2" />
                )}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Feature strip */}
      <div className="relative z-10 border-t border-ft-border bg-ft-bg2/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-ft-bg4 border border-ft-border flex items-center justify-center">
                <f.icon size={18} className="text-ft-v400" />
              </div>
              <div>
                <div className="text-ft-text text-sm font-medium">{f.label}</div>
                <div className="text-ft-text3 text-xs mt-0.5">{f.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
