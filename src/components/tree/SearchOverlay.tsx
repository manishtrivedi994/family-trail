import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import type { Member, MemberSide } from '../../types'

const sideGradient: Record<MemberSide, string> = {
  owner:    'linear-gradient(135deg,#7C5CFF,#9B7AFF)',
  ancestor: 'linear-gradient(135deg,rgba(124,92,255,0.5),rgba(155,122,255,0.4))',
  spouse:   'linear-gradient(135deg,#1BA090,#2DD4BF)',
  child:    'linear-gradient(135deg,#A07820,#D4A843)',
  unknown:  'linear-gradient(135deg,rgba(100,100,100,0.4),rgba(120,120,120,0.3))',
}

const sideDot: Record<MemberSide, string> = {
  owner:    'bg-ft-v400',
  ancestor: 'bg-ft-v700',
  spouse:   'bg-ft-teal',
  child:    'bg-ft-gold',
  unknown:  'bg-ft-text3',
}

interface SearchOverlayProps {
  members: Member[]
  sideMap: Record<string, MemberSide>
  onSelect: (memberId: string) => void
  onClose: () => void
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function SearchOverlay({ members, sideMap, onSelect, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = query.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase().trim()))
    : members.slice(0, 10)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      onSelect(results[activeIndex].id)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="absolute top-0 left-0 right-0 z-50 bg-ft-bg2/98 backdrop-blur border-b border-ft-border2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        {/* Input row */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-ft-border">
          <Search size={15} className="text-ft-text3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search family members…"
            className="flex-1 bg-transparent text-sm text-ft-text placeholder:text-ft-text3 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-ft-text3 hover:text-ft-text transition-colors"
            aria-label="Close search"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto">
          <AnimatePresence mode="wait">
            {results.length === 0 ? (
              <p className="text-center py-8 text-ft-text3 text-sm">
                No members found for &ldquo;{query}&rdquo;
              </p>
            ) : (
              results.map((m, i) => {
                const side = sideMap[m.id] ?? 'unknown'
                return (
                  <button
                    key={m.id}
                    onClick={() => { onSelect(m.id); onClose() }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === activeIndex ? 'bg-ft-bg4' : 'hover:bg-ft-bg3'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                      style={!m.photo_url ? { background: sideGradient[side] } : undefined}
                    >
                      {m.photo_url
                        ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                        : getInitials(m.name)
                      }
                    </div>
                    <span className="text-sm text-ft-text2 font-medium flex-1 truncate">{m.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sideDot[side]}`} />
                  </button>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}
