import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  immer((set) => ({
    user: null,
    session: null,
    loading: true,
    setSession: (session) => {
      set((state) => {
        state.session = session
        state.user = session?.user ?? null
        state.loading = false
      })
    },
    signOut: async () => {
      await supabase.auth.signOut()
      set((state) => {
        state.user = null
        state.session = null
      })
    },
  }))
)
