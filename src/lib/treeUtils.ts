import Dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { Member, Relationship, MemberSide, RelationshipType } from '../types'

type Relation = 'Parent' | 'Grandparent' | 'Sibling' | 'Child' | 'Spouse' | 'Aunt/Uncle' | 'Cousin' | 'Other'

interface NewRelationship {
  tree_id: string
  from_id: string
  to_id: string
  type: RelationshipType
}

type DeriveResult =
  | { ok: true; relationships: NewRelationship[] }
  | { ok: false; reason: 'NEEDS_DISAMBIGUATION' }
  | { ok: false; reason: 'CYCLE'; violations: { from_id: string; to_id: string }[] }

export function wouldCreateCycle(
  parentId: string,
  childId: string,
  relationships: Relationship[]
): boolean {
  const visited = new Set<string>()
  const queue: string[] = [childId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === parentId) return true
    if (visited.has(current)) continue
    visited.add(current)
    relationships
      .filter(r => r.type === 'parent_of' && r.from_id === current)
      .forEach(r => queue.push(r.to_id))
  }
  return false
}

export function describeCycleError(
  newMemberName: string,
  anchorName: string,
  relation: string
): string {
  return `Cannot add ${newMemberName} as ${relation} of ${anchorName} — this would create a loop in the family tree. A person cannot be both an ancestor and a descendant of the same individual.`
}

export function findCycles(relationships: Relationship[]): string[][] {
  const parentOfEdges = relationships.filter(r => r.type === 'parent_of')
  const visited = new Set<string>()
  const cycles: string[][] = []

  function dfs(nodeId: string, path: string[], pathSet: Set<string>) {
    if (pathSet.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId)
      cycles.push(path.slice(cycleStart))
      return
    }
    if (visited.has(nodeId)) return
    pathSet.add(nodeId)
    path.push(nodeId)
    parentOfEdges
      .filter(r => r.from_id === nodeId)
      .forEach(r => dfs(r.to_id, [...path], new Set(pathSet)))
    visited.add(nodeId)
  }

  const allNodes = new Set([
    ...parentOfEdges.map(r => r.from_id),
    ...parentOfEdges.map(r => r.to_id),
  ])
  allNodes.forEach(nodeId => dfs(nodeId, [], new Set()))
  return cycles
}

export function deriveRelationships(
  newMemberId: string,
  anchorId: string,
  relation: Relation,
  treeId: string,
  members: Member[],
  relationships: Relationship[],
  grandparentTargetParentId?: string
): DeriveResult {
  const result: NewRelationship[] = []
  const cycleViolations: { from_id: string; to_id: string }[] = []

  function parentsOf(personId: string): string[] {
    return relationships.filter(r => r.type === 'parent_of' && r.to_id === personId).map(r => r.from_id)
  }

  function childrenOf(personId: string): string[] {
    return relationships.filter(r => r.type === 'parent_of' && r.from_id === personId).map(r => r.to_id)
  }

  function siblingsOf(personId: string): string[] {
    return relationships
      .filter(r => r.type === 'sibling_of' && (r.from_id === personId || r.to_id === personId))
      .map(r => r.from_id === personId ? r.to_id : r.from_id)
  }

  function spousesOf(personId: string): string[] {
    return relationships
      .filter(r => r.type === 'spouse_of' && (r.from_id === personId || r.to_id === personId))
      .map(r => r.from_id === personId ? r.to_id : r.from_id)
  }

  function addRel(from_id: string, to_id: string, type: RelationshipType) {
    if (from_id === to_id) return
    if (type === 'parent_of' && wouldCreateCycle(from_id, to_id, relationships)) {
      cycleViolations.push({ from_id, to_id })
      return
    }
    const duplicate =
      relationships.some(r => r.from_id === from_id && r.to_id === to_id && r.type === type) ||
      result.some(r => r.from_id === from_id && r.to_id === to_id && r.type === type)
    if (!duplicate) result.push({ tree_id: treeId, from_id, to_id, type })
  }

  switch (relation) {
    case 'Parent': {
      addRel(newMemberId, anchorId, 'parent_of')
      siblingsOf(anchorId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))
      parentsOf(anchorId).forEach(existingParentId => {
        addRel(existingParentId, newMemberId, 'spouse_of')
      })
      break
    }

    case 'Grandparent': {
      const anchorParents = parentsOf(anchorId)
      if (anchorParents.length === 0) {
        addRel(newMemberId, anchorId, 'parent_of')
      } else if (anchorParents.length === 1) {
        const parentId = anchorParents[0]
        addRel(newMemberId, parentId, 'parent_of')
        siblingsOf(parentId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))
        parentsOf(parentId).forEach(existingGrandparentId => {
          addRel(existingGrandparentId, newMemberId, 'spouse_of')
        })
      } else {
        if (!grandparentTargetParentId) return { ok: false, reason: 'NEEDS_DISAMBIGUATION' }
        addRel(newMemberId, grandparentTargetParentId, 'parent_of')
        siblingsOf(grandparentTargetParentId).forEach(sibId => addRel(newMemberId, sibId, 'parent_of'))
        parentsOf(grandparentTargetParentId).forEach(existingGrandparentId => {
          addRel(existingGrandparentId, newMemberId, 'spouse_of')
        })
      }
      break
    }

    case 'Sibling': {
      addRel(anchorId, newMemberId, 'sibling_of')
      parentsOf(anchorId).forEach(parentId => addRel(parentId, newMemberId, 'parent_of'))
      siblingsOf(anchorId).forEach(sibId => addRel(sibId, newMemberId, 'sibling_of'))
      break
    }

    case 'Child': {
      addRel(anchorId, newMemberId, 'parent_of')
      spousesOf(anchorId).forEach(spouseId => addRel(spouseId, newMemberId, 'parent_of'))
      childrenOf(anchorId).forEach(childId => addRel(childId, newMemberId, 'sibling_of'))
      break
    }

    case 'Spouse': {
      addRel(anchorId, newMemberId, 'spouse_of')
      childrenOf(anchorId).forEach(childId => addRel(newMemberId, childId, 'parent_of'))
      break
    }

    case 'Aunt/Uncle': {
      parentsOf(anchorId).forEach(parentId => addRel(parentId, newMemberId, 'sibling_of'))
      break
    }

    case 'Cousin':
    case 'Other': {
      addRel(anchorId, newMemberId, 'sibling_of')
      break
    }
  }

  if (cycleViolations.length > 0) return { ok: false, reason: 'CYCLE', violations: cycleViolations }
  return { ok: true, relationships: result }
}


export function findRelationshipPath(
  fromId: string,
  toId: string,
  members: Member[],
  relationships: Relationship[]
): Member[] | null {
  if (fromId === toId) {
    const m = members.find((m) => m.id === fromId)
    return m ? [m] : null
  }

  const memberMap = new Map(members.map((m) => [m.id, m]))

  // Bidirectional adjacency list
  const adj = new Map<string, string[]>()
  members.forEach((m) => adj.set(m.id, []))
  relationships.forEach((r) => {
    adj.get(r.from_id)?.push(r.to_id)
    adj.get(r.to_id)?.push(r.from_id)
  })

  // BFS
  const visited = new Set<string>([fromId])
  const queue: string[][] = [[fromId]]

  while (queue.length) {
    const path = queue.shift()!
    const current = path[path.length - 1]
    for (const neighbor of (adj.get(current) ?? [])) {
      if (neighbor === toId) {
        return [...path, neighbor].map((id) => memberMap.get(id)!).filter(Boolean)
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }

  return null
}

const NODE_WIDTH = 160
const NODE_HEIGHT = 72

export function getSideMap(
  members: Member[],
  relationships: Relationship[],
  ownerId: string
): Record<string, MemberSide> {
  const sideMap = new Map<string, MemberSide>()
  if (ownerId) sideMap.set(ownerId, 'owner')

  const ownerSpouseRels = relationships.filter(
    (r) => r.type === 'spouse_of' && (r.from_id === ownerId || r.to_id === ownerId)
  )
  const spouseId = ownerSpouseRels.length > 0
    ? (ownerSpouseRels[0].from_id === ownerId ? ownerSpouseRels[0].to_id : ownerSpouseRels[0].from_id)
    : null

  if (spouseId) sideMap.set(spouseId, 'spouse')

  relationships
    .filter((r) => r.type === 'parent_of' && r.from_id === ownerId)
    .forEach((r) => sideMap.set(r.to_id, 'child'))

  const queue = ownerId ? [ownerId] : []
  while (queue.length) {
    const current = queue.shift()!
    relationships
      .filter((r) => r.type === 'parent_of' && r.to_id === current)
      .forEach((r) => {
        if (!sideMap.has(r.from_id)) {
          sideMap.set(r.from_id, 'ancestor')
          queue.push(r.from_id)
        }
      })
  }

  if (spouseId) {
    const spouseQueue = [spouseId]
    while (spouseQueue.length) {
      const current = spouseQueue.shift()!
      relationships
        .filter((r) => r.type === 'parent_of' && r.to_id === current)
        .forEach((r) => {
          if (!sideMap.has(r.from_id)) {
            sideMap.set(r.from_id, 'spouse')
            spouseQueue.push(r.from_id)
          }
        })
    }
  }

  members.forEach((m) => { if (!sideMap.has(m.id)) sideMap.set(m.id, 'unknown') })

  const result: Record<string, MemberSide> = {}
  sideMap.forEach((v, k) => { result[k] = v })
  return result
}

export function buildFlowGraph(
  members: Member[],
  relationships: Relationship[],
  ownerId: string
): { nodes: Node[]; edges: Edge[] } {
  if (members.length === 0) return { nodes: [], edges: [] }

  const g = new Dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })

  members.forEach((m) => g.setNode(m.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))

  relationships.forEach((r) => {
    if (r.type === 'parent_of') g.setEdge(r.from_id, r.to_id)
  })

  Dagre.layout(g)

  const sides = getSideMap(members, relationships, ownerId)

  const nodes: Node[] = members.map((m) => {
    const pos = g.node(m.id) as { x?: number; y?: number } | undefined
    return {
      id: m.id,
      type: 'memberNode',
      position: {
        x: pos?.x != null ? pos.x - NODE_WIDTH / 2 : 0,
        y: pos?.y != null ? pos.y - NODE_HEIGHT / 2 : 0,
      },
      data: {
        member: m,
        side: sides[m.id] ?? 'unknown',
      },
    }
  })

  const edges: Edge[] = relationships.map((r) => ({
    id: r.id,
    source: r.from_id,
    target: r.to_id,
    type: 'relationshipEdge',
    sourceHandle: r.type === 'spouse_of' ? 'r' : 'b',
    targetHandle: r.type === 'spouse_of' ? 'l' : 't',
    data: { relType: r.type },
  }))

  return { nodes, edges }
}
