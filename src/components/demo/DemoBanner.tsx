import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function DemoBanner() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, type: 'spring', damping: 24 }}
      className="flex items-center justify-between gap-4 px-5 py-3
                 bg-gradient-to-r from-ft-v700/60 via-ft-v600/40 to-ft-v700/60
                 border-b border-ft-v500/20 shrink-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Sparkles className="w-4 h-4 text-ft-v200 flex-shrink-0" />
        <p className="text-sm text-ft-v100 truncate">
          You're exploring a demo tree — the Sharma–Mehta family.
          <span className="text-ft-text3 ml-1 hidden sm:inline">
            Tap any member to explore their profile.
          </span>
        </p>
      </div>
      <button
        onClick={() => navigate('/?fromDemo=true')}
        className="flex-shrink-0 text-sm font-semibold px-4 py-1.5 rounded-xl
                   bg-gradient-to-br from-ft-v500 to-ft-v400 text-white
                   hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,92,255,0.4)]
                   transition-all whitespace-nowrap"
      >
        Build your own →
      </button>
    </motion.div>
  )
}
