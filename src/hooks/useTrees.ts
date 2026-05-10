import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Tree, MemberRole } from '../types'

interface TreeRow {
  role: MemberRole
  trees: {
    id: string
    name: string
    owner_id: string
    visibility: string
    created_at: string
  } | null
}

export function useTrees() {
  const { user } = useAuthStore()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchTrees() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tree_members')
        .select(`role, trees (id, name, owner_id, visibility, created_at)`)
        .eq('user_id', user.id)

      if (err) throw err

      const rows = (data as unknown as TreeRow[]) ?? []
      setTrees(
        rows
          .filter((r) => r.trees !== null)
          .map((r) => ({
            ...(r.trees as Tree),
            my_role: r.role,
          }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrees()
  }, [user?.id])

  return { trees, loading, error, refetch: fetchTrees }
}
