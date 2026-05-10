import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useToastStore } from '../../store/toastStore'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="pointer-events-auto flex items-center gap-3 bg-ft-bg3 border border-ft-border2 rounded-2xl px-4 py-3 text-sm text-ft-text shadow-xl max-w-sm w-max"
            style={{
              borderLeft: toast.type === 'success'
                ? '3px solid #2DD4BF'
                : toast.type === 'error'
                ? '3px solid #E879A0'
                : '3px solid rgba(155,122,255,0.5)',
            }}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-ft-text3 hover:text-ft-text transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
