import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Member, Relationship } from '../../types'

type RelColorKey = 'parent' | 'child' | 'spouse' | 'sibling'

const relColors: Record<RelColorKey, string> = {
  parent:  'linear-gradient(135deg, #4B30B8, #6344E0)',
  child:   'linear-gradient(135deg, #92730A, #D4A843)',
  spouse:  'linear-gradient(135deg, #1BA090, #2DD4BF)',
  sibling: 'linear-gradient(135deg, #7C5CFF, #9B7AFF)',
}

function ConnectionCard({
  member,
  relationLabel,
  colorKey,
  treeId,
}: {
  member: Member
  relationLabel: string
  colorKey: RelColorKey
  treeId: string
}) {
  const navigate = useNavigate()
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button
      onClick={() => navigate(`/tree/${treeId}/member/${member.id}`)}
      className="flex items-center gap-3 p-3 rounded-2xl bg-ft-bg3 border border-ft-border hover:border-ft-border2 cursor-pointer transition-colors text-left w-full"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ background: relColors[colorKey] }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ft-text truncate">{member.name}</p>
        <p className="text-[11px] text-ft-text3">{relationLabel}</p>
      </div>
      <ChevronRight size={14} className="text-ft-text3 shrink-0" />
    </button>
  )
}

interface ConnectionsGridProps {
  connections: Member[]
  relationships: Relationship[]
  memberId: string
  treeId: string
}

export function ConnectionsGrid({ connections, relationships, memberId, treeId }: ConnectionsGridProps) {
  const parents = relationships
    .filter((r) => r.type === 'parent_of' && r.to_id === memberId)
    .map((r) => connections.find((m) => m.id === r.from_id))
    .filter((m): m is Member => m !== undefined)

  const children = relationships
    .filter((r) => r.type === 'parent_of' && r.from_id === memberId)
    .map((r) => connections.find((m) => m.id === r.to_id))
    .filter((m): m is Member => m !== undefined)

  const spouses = relationships
    .filter((r) => r.type === 'spouse_of')
    .map((r) => {
      const otherId = r.from_id === memberId ? r.to_id : r.from_id
      return connections.find((m) => m.id === otherId)
    })
    .filter((m): m is Member => m !== undefined)

  const siblings = relationships
    .filter((r) => r.type === 'sibling_of')
    .map((r) => {
      const otherId = r.from_id === memberId ? r.to_id : r.from_id
      return connections.find((m) => m.id === otherId)
    })
    .filter((m): m is Member => m !== undefined)

  const allSections: Array<{
    title: string
    members: Member[]
    colorKey: RelColorKey
    label: string
  }> = [
    { title: 'Parents', members: parents, colorKey: 'parent' as RelColorKey, label: 'Parent' },
    { title: 'Spouse(s)', members: spouses, colorKey: 'spouse' as RelColorKey, label: 'Spouse' },
    { title: 'Children', members: children, colorKey: 'child' as RelColorKey, label: 'Child' },
    { title: 'Siblings', members: siblings, colorKey: 'sibling' as RelColorKey, label: 'Sibling' },
  ]
  const sections = allSections.filter((s) => s.members.length > 0)

  if (sections.length === 0) {
    return (
      <p className="text-sm text-ft-text3 text-center py-4">No connections recorded yet</p>
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] uppercase tracking-widest text-ft-text3 font-medium mb-2">
            {section.title}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {section.members.map((member) => (
              <ConnectionCard
                key={member.id}
                member={member}
                relationLabel={section.label}
                colorKey={section.colorKey}
                treeId={treeId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
