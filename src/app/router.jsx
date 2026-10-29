import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth, RequireRole } from '@/features/auth/guards'
import { useAuth } from '@/features/auth/AuthProvider'
import { homeFor } from '@/lib/permissions'
import { AppLayout } from '@/components/layout/AppLayout'
import { Loader2 } from 'lucide-react'

const SuspenseLoader = () => (
  <div className="flex h-96 w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
  </div>
)

const L = (importFn) => {
  const Component = lazy(importFn)
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Component />
    </Suspense>
  )
}

function HomeRedirect() {
  const { profile } = useAuth()
  return <Navigate to={homeFor(profile?.role)} replace />
}

export const router = createBrowserRouter([
  // Public authentication routes
  { path: '/login', element: L(() => import('@/pages/Login')) },
  { path: '/forgot-password', element: L(() => import('@/pages/ForgotPassword')) },
  { path: '/reset-password', element: L(() => import('@/pages/ResetPassword')) },
  { path: '/access-denied', element: L(() => import('@/pages/AccessDenied')) },
  { path: '/account-suspended', element: L(() => import('@/pages/Suspended')) },
  { path: '/session-expired', element: L(() => import('@/pages/SessionExpired')) },

  // Authenticated application routes with standard AppLayout
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/dashboard', element: L(() => import('@/pages/ViewerDashboard')) },
          { path: '/files', element: L(() => import('@/pages/Files')) },
          { path: '/files/:id', element: L(() => import('@/pages/FileDetail')) },
          { path: '/recent', element: L(() => import('@/pages/Recent')) },
          { path: '/profile', element: L(() => import('@/pages/Profile')) },

          // Editor & Admin accessible routes
          {
            element: <RequireRole roles={['EDITOR', 'ADMIN']} />,
            children: [
              { path: '/editor', element: L(() => import('@/pages/EditorDashboard')) },
              { path: '/editor/uploads', element: L(() => import('@/pages/EditorUploads')) },
              { path: '/editor/activity', element: L(() => import('@/pages/EditorActivity')) },
            ],
          },

          // Administrator strictly protected routes
          {
            element: <RequireRole roles={['ADMIN']} />,
            children: [
              { path: '/admin', element: L(() => import('@/pages/admin/Overview')) },
              { path: '/admin/users', element: L(() => import('@/pages/admin/Users')) },
              { path: '/admin/users/:id', element: L(() => import('@/pages/admin/UserDetail')) },
              { path: '/admin/files', element: L(() => import('@/pages/admin/Files')) },
              { path: '/admin/activity', element: L(() => import('@/pages/admin/Activity')) },
              { path: '/admin/analytics', element: L(() => import('@/pages/admin/Analytics')) },
              { path: '/admin/audit-logs', element: L(() => import('@/pages/admin/AuditLogs')) },
              { path: '/admin/trash', element: L(() => import('@/pages/admin/Trash')) },
              { path: '/admin/settings', element: L(() => import('@/pages/admin/Settings')) },
            ],
          },
        ],
      },
    ],
  },

  // 404 Catch-All
  { path: '*', element: L(() => import('@/pages/NotFound')) },
])
