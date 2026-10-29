import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading NoteVault...</p>
      </div>
    </div>
  )
}

export function RequireAuth() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!profile || profile.status === 'SUSPENDED') {
    return <Navigate to="/account-suspended" replace />
  }

  return <Outlet />
}

export function RequireRole({ roles }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
