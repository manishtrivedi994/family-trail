import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTreeStore } from '../store/treeStore'
import { useAuthStore } from '../store/authStore'
import type { Member, Relationship, Tree } from '../types'

function cacheKey(treeId: string) {
  return `ft_tree_${treeId}`
}

function saveToCache(treeId: string, members: Member[], relationships: Relationship[]) {
  try {
    localStorage.setItem(cacheKey(treeId), JSON.stringify({ members, relationships, cachedAt: Date.now() }))
  } catch (e) {
    console.debug('Cache save failed:', e)
  }
}

function loadFromCache(treeId: string): { members: Member[]; relationships: Relationship[] } | null {
  try {
    const raw = localStorage.getItem(cacheKey(treeId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function useTree(treeId: string) {
  const store = useTreeStore()

  useEffect(() => {
    if (!treeId) return
    store.setLoading(true)

    async function load() {
      const currentUserId = useAuthStore.getState().user?.id
      try {
        const [{ data: tree }, { data: members }, { data: rels }, { data: tm }] = await Promise.all([
          supabase.from('trees').select('*').eq('id', treeId).single(),
          supabase.from('members').select('*').eq('tree_id', treeId),
          supabase.from('relationships').select('*').eq('tree_id', treeId),
          currentUserId
            ? supabase.from('tree_members').select('role').eq('tree_id', treeId).eq('user_id', currentUserId).single()
            : Promise.resolve({ data: null }),
        ])
        if (tree) store.setTree(tree as Tree)
        const memberList = (members ?? []) as Member[]
        const relList = (rels ?? []) as Relationship[]
        store.setMembers(memberList)
        store.setRelationships(relList)
        if (tm) store.setMyRole((tm as { role: import('../types').MemberRole }).role)
        saveToCache(treeId, memberList, relList)
      } catch {
        // Offline or network error — serve from cache
        const cached = loadFromCache(treeId)
        if (cached) {
          store.setMembers(cached.members)
          store.setRelationships(cached.relationships)
        }
      } finally {
        store.setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`tree:${treeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `tree_id=eq.${treeId}` },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') {
            store.removeMember((o as Member).id)
          } else {
            const newMember = n as Member
            if (eventType === 'INSERT') {
              const currentUserId = useAuthStore.getState().user?.id
              if (newMember.created_by !== currentUserId) {
                store.markMemberNew(newMember.id)
              }
            }
            store.upsertMember(newMember)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'relationships', filter: `tree_id=eq.${treeId}` },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') store.removeRelationship((o as Relationship).id)
          else store.upsertRelationship(n as Relationship)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [treeId])
}
