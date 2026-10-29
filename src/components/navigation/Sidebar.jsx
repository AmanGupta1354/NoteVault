import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Activity,
  BarChart3,
  ShieldAlert,
  Trash2,
  Settings,
  UploadCloud,
  Clock,
  User,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { RoleBadge } from '@/components/common/Badge'
import { cn } from '@/lib/utils'

export function Sidebar({ collapsed, setCollapsed }) {
  const { profile } = useAuth()
  const role = profile?.role || 'VIEWER'

  const getNavItems = () => {
    if (role === 'ADMIN') {
      return [
        { label: 'Admin Overview', path: '/admin', icon: LayoutDashboard },
        { label: 'User Directory', path: '/admin/users', icon: Users },
        { label: 'Shared Library', path: '/files', icon: FolderOpen },
        { label: 'File Operations', path: '/admin/files', icon: FileText },
        { label: 'Platform Activity', path: '/admin/activity', icon: Activity },
        { label: 'Analytics & KPIs', path: '/admin/analytics', icon: BarChart3 },
        { label: 'Security Audit', path: '/admin/audit-logs', icon: ShieldAlert },
        { label: 'Trash Recovery', path: '/admin/trash', icon: Trash2 },
        { label: 'Platform Settings', path: '/admin/settings', icon: Settings },
      ]
    }
    if (role === 'EDITOR') {
      return [
        { label: 'Editor Dashboard', path: '/editor', icon: LayoutDashboard },
        { label: 'Shared Library', path: '/files', icon: FolderOpen },
        { label: 'My Uploads', path: '/editor/uploads', icon: UploadCloud },
        { label: 'My Activity', path: '/editor/activity', icon: Activity },
        { label: 'My Profile', path: '/profile', icon: User },
      ]
    }
    // VIEWER
    return [
      { label: 'Viewer Hub', path: '/dashboard', icon: LayoutDashboard },
      { label: 'File Library', path: '/files', icon: FolderOpen },
      { label: 'Recent Files', path: '/recent', icon: Clock },
      { label: 'My Profile', path: '/profile', icon: User },
    ]
  }

  const items = getNavItems()

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Note<span className="text-indigo-600 dark:text-indigo-400">Vault</span>
              </span>
              <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                v2.0
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
            <Shield className="h-5 w-5" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Role and User tag */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">Access Level</p>
          <div className="mt-1 flex items-center justify-between">
            <RoleBadge role={role} />
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>
      )}

      {/* Navigation list */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/editor' || item.path === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile snippet at bottom */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {profile?.display_name || 'User'}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {profile?.email}
              </p>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
