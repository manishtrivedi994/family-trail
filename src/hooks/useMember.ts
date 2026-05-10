import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, Relationship } from '../types'

interface UseMemberResult {
  member: Member | null
  relationships: Relationship[]
  connections: Member[]
  loading: boolean
  error: string | null
}

export function useMember(treeId: string, memberId: string, refreshKey = 0): UseMemberResult {
  const [member, setMember] = useState<Member | null>(null)
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [connections, setConnections] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!treeId || !memberId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .select('*')
          .eq('id', memberId)
          .single()
        if (memberErr) throw memberErr

        const { data: relsData, error: relsErr } = await supabase
          .from('relationships')
          .select('*')
          .eq('tree_id', treeId)
          .or(`from_id.eq.${memberId},to_id.eq.${memberId}`)
        if (relsErr) throw relsErr

        const rels = (relsData ?? []) as Relationship[]
        const connectedIds = rels.map((r) => (r.from_id === memberId ? r.to_id : r.from_id))

        let connData: Member[] = []
        if (connectedIds.length > 0) {
          const { data, error: connErr } = await supabase
            .from('members')
            .select('*')
            .in('id', connectedIds)
          if (connErr) throw connErr
          connData = (data ?? []) as Member[]
        }

        if (!cancelled) {
          setMember(memberData as Member)
          setRelationships(rels)
          setConnections(connData)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load member')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [treeId, memberId, refreshKey])

  return { member, relationships, connections, loading, error }
}
