import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Member, MemberRole, Relationship, Tree } from '../types'

interface TreeState {
  tree: Tree | null
  members: Member[]
  relationships: Relationship[]
  loading: boolean
  selectedMemberId: string | null
  newMemberIds: string[]
  myRole: MemberRole | null
  setTree: (tree: Tree) => void
  setMembers: (members: Member[]) => void
  setRelationships: (rels: Relationship[]) => void
  setLoading: (v: boolean) => void
  setSelectedMember: (id: string | null) => void
  setMyRole: (role: MemberRole | null) => void
  upsertMember: (m: Member) => void
  removeMember: (id: string) => void
  upsertRelationship: (r: Relationship) => void
  removeRelationship: (id: string) => void
  markMemberNew: (id: string) => void
  markMemberSeen: (id: string) => void
}

export const useTreeStore = create<TreeState>()(
  immer((set) => ({
    tree: null,
    members: [],
    relationships: [],
    loading: true,
    selectedMemberId: null,
    newMemberIds: [],
    myRole: null,
    setTree: (tree) => set((s) => { s.tree = tree }),
    setMembers: (members) => set((s) => { s.members = members }),
    setRelationships: (rels) => set((s) => { s.relationships = rels }),
    setLoading: (v) => set((s) => { s.loading = v }),
    setSelectedMember: (id) => set((s) => { s.selectedMemberId = id }),
    setMyRole: (role) => set((s) => { s.myRole = role }),
    upsertMember: (m) => set((s) => {
      const idx = s.members.findIndex(x => x.id === m.id)
      if (idx >= 0) s.members[idx] = m
      else s.members.push(m)
    }),
    removeMember: (id) => set((s) => {
      s.members = s.members.filter(x => x.id !== id)
      // Cascade clean-up relationships attached to this member
      s.relationships = s.relationships.filter(x => x.from_id !== id && x.to_id !== id)
    }),
    upsertRelationship: (r) => set((s) => {
      const idx = s.relationships.findIndex(x => x.id === r.id)
      if (idx >= 0) s.relationships[idx] = r
      else s.relationships.push(r)
    }),
    removeRelationship: (id) => set((s) => { s.relationships = s.relationships.filter(x => x.id !== id) }),
    markMemberNew: (id) => set((s) => {
      if (!s.newMemberIds.includes(id)) s.newMemberIds.push(id)
    }),
    markMemberSeen: (id) => set((s) => {
      s.newMemberIds = s.newMemberIds.filter(x => x !== id)
    }),
  }))
)
