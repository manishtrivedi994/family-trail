import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Member, MemberSide } from '../../types'
import { useTreeStore } from '../../store/treeStore'
import { useAuthStore } from '../../store/authStore'

type MemberNodeData = { member: Member; side: MemberSide }
export type MemberNodeType = Node<MemberNodeData, 'memberNode'>

const sideConfig: Record<MemberSide, { border: string; bg: string; textAccent: string; avatarFrom: string; avatarTo: string }> = {
  owner:    { border: '#9B7AFF', bg: 'rgba(124,92,255,0.25)', textAccent: '#C4B5FD', avatarFrom: '#7C5CFF', avatarTo: '#9B7AFF' },
  ancestor: { border: 'rgba(155,122,255,0.3)', bg: 'rgba(124,92,255,0.12)', textAccent: 'rgba(196,181,253,0.7)', avatarFrom: 'rgba(124,92,255,0.5)', avatarTo: 'rgba(155,122,255,0.4)' },
  spouse:   { border: 'rgba(45,212,191,0.5)', bg: 'rgba(45,212,191,0.18)', textAccent: '#2DD4BF', avatarFrom: '#1BA090', avatarTo: '#2DD4BF' },
  child:    { border: 'rgba(212,168,67,0.4)', bg: 'rgba(212,168,67,0.15)', textAccent: '#D4A843', avatarFrom: '#A07820', avatarTo: '#D4A843' },
  unknown:  { border: 'rgba(160,130,255,0.2)', bg: 'rgba(160,130,255,0.08)', textAccent: 'rgba(237,233,255,0.5)', avatarFrom: 'rgba(160,130,255,0.3)', avatarTo: 'rgba(160,130,255,0.2)' },
}

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'rgba(160,130,255,0.22)',
  border: '1px solid rgba(160,130,255,0.40)',
}

const sideLabel: Record<MemberSide, string> = {
  owner: 'You',
  ancestor: 'Ancestor',
  spouse: 'Spouse',
  child: 'Child',
  unknown: 'Relative',
}

export function MemberNode({ data, selected }: NodeProps<MemberNodeType>) {
  const { member, side } = data
  const setSelectedMember = useTreeStore((s) => s.setSelectedMember)
  const isNew = useTreeStore((s) => s.newMemberIds.includes(member.id))
  const markMemberSeen = useTreeStore((s) => s.markMemberSeen)
  const userId = useAuthStore((s) => s.user?.id)
  const myMemberId = useTreeStore((s) => s.members.find(m => m.user_id === userId)?.id)
  const isDirectSpouse = useTreeStore((s) => 
    s.relationships.some(r => 
      r.type === 'spouse_of' && 
      ((r.from_id === member.id && r.to_id === myMemberId) || 
       (r.to_id === member.id && r.from_id === myMemberId))
    )
  )
  
  const cfg = sideConfig[side]
  const computedLabel = side === 'spouse' 
    ? (isDirectSpouse ? 'Spouse' : "Spouse's Family")
    : sideLabel[side]

  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => markMemberSeen(member.id), 800)
      return () => clearTimeout(t)
    }
  }, [isNew, member.id, markMemberSeen])

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.div
      className="relative w-40 rounded-xl px-3 py-2.5 cursor-pointer select-none"
      animate={isNew ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={isNew ? { duration: 0.6, ease: 'easeInOut' } : { duration: 0.15 }}
      whileHover={{ scale: 1.04 }}
      style={{
        background: cfg.bg,
        border: `1.5px solid ${selected ? '#9B7AFF' : cfg.border}`,
        boxShadow: selected
          ? '0 0 0 3px rgba(124,92,255,0.25)'
          : isNew
          ? `0 0 20px rgba(124,92,255,0.4)`
          : '0 2px 12px rgba(0,0,0,0.3)',
      }}
      onClick={() => setSelectedMember(member.id)}
    >
      <Handle type="target" position={Position.Top} id="t" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="l" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" style={handleStyle} />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
          style={!member.photo_url ? { background: `linear-gradient(135deg, ${cfg.avatarFrom}, ${cfg.avatarTo})`, color: '#EDE9FF' } : undefined}
        >
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.currentTarget
                t.style.display = 'none'
                t.parentElement!.style.background = `linear-gradient(135deg, ${cfg.avatarFrom}, ${cfg.avatarTo})`
                t.parentElement!.textContent = initials
              }}
            />
          ) : initials}
        </div>
        <p className="font-display text-sm font-semibold text-ft-text truncate leading-tight flex-1 min-w-0">
          {member.name}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p
          className="text-[10px] uppercase tracking-widest font-medium"
          style={{ color: cfg.textAccent }}
        >
          {computedLabel}
        </p>
        {!member.is_living && (
          <span className="text-[9px] text-ft-text3">✦</span>
        )}
      </div>

      {/* Amber dot: unclaimed member with no linked account */}
      {!member.user_id && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ft-gold border-2 border-ft-bg" />
      )}
    </motion.div>
  )
}
