import { useNavigate } from 'react-router-dom'
import { LogoMark } from '../ui/LogoMark'

export function DemoToolbar() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-4 py-2.5 shrink-0
                    bg-ft-bg2/90 backdrop-blur border-b border-ft-border">
      <div className="flex items-center gap-2">
        <LogoMark size={22} />
        <span className="font-display text-sm tracking-widest uppercase text-ft-text3">
          Family Trail
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-display text-base font-semibold hidden sm:block text-ft-text">
          Sharma–Mehta Family
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full
                         bg-ft-v500/20 text-ft-v200 border border-ft-v500/30
                         uppercase tracking-widest">
          Demo
        </span>
      </div>

      <button
        onClick={() => navigate('/?fromDemo=true')}
        className="text-sm font-semibold px-4 py-2 rounded-xl
                   bg-gradient-to-br from-ft-v500 to-ft-v400 text-white
                   hover:-translate-y-0.5 transition-all"
      >
        Start for free
      </button>
    </div>
  )
}
