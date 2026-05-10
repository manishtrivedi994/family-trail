import { motion } from 'framer-motion'

export function AnimatedOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.22) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.16) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.12) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  )
}
