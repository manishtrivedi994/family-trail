import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { trackPage } from './lib/analytics'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import { ToastContainer } from './components/ui/ToastContainer'
import { Landing } from './pages/Landing'
import { DemoTreeView } from './pages/DemoTreeView'
import { Dashboard } from './pages/Dashboard'
import { TreeView } from './pages/TreeView'
import { TreeSettings } from './pages/TreeSettings'
import { AccountSettings } from './pages/AccountSettings'
import { MemberPage } from './pages/MemberPage'
import { InviteClaim } from './pages/InviteClaim'

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

function AuthListener() {
  const { setSession } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        const fromDemo = new URLSearchParams(window.location.search).get('fromDemo')
        navigate(fromDemo ? '/dashboard?fromDemo=true' : '/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

function PageTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPage(location.pathname)
  }, [location.pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.key}>
        <Route path="/" element={
          <PageTransition><Landing /></PageTransition>
        } />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <PageTransition><Dashboard /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <PageTransition><AccountSettings /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/tree/:id" element={
          <PageTransition><TreeView /></PageTransition>
        } />
        <Route path="/tree/:treeId/settings" element={
          <ProtectedRoute>
            <PageTransition><TreeSettings /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/tree/:treeId/member/:memberId" element={
          <MemberPage />
        } />
        <Route path="/demo" element={
          <PageTransition><DemoTreeView /></PageTransition>
        } />
        <Route path="/join/:token" element={<InviteClaim />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthListener />
        <PageTracker />
        <ToastContainer />
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
