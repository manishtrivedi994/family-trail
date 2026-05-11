import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-ft-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ft-v400 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/?openAuth=true" replace />
  return <>{children}</>
}
