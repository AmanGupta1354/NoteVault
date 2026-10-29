import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users,
  FolderOpen,
  HardDrive,
  Activity,
  Eye,
  Download,
  Shield,
  Clock,
  ArrowRight,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { RoleBadge, StatusBadge } from '@/components/common/Badge'
import { formatBytes, formatDate } from '@/lib/utils'

export default function AdminOverview() {
  // 1. Registered Profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // 2. Online Users (from RPC)
  const { data: onlineUsersList = [] } = useQuery({
    queryKey: ['admin-online-users'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('online_users', { p_window_seconds: 90 })
      if (error) return []
      return data || []
    },
  })

  // 3. Active File Viewing Sessions (from RPC)
  const { data: activeViewings = [] } = useQuery({
    queryKey: ['admin-active-viewing'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('active_viewing', { p_window_seconds: 90 })
      if (error) return []
      return data || []
    },
  })

  // 4. File Library Statistics
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['admin-files-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('id, name, size_bytes, category, created_at, deleted_at')
      if (error) throw error
      return data
    },
  })

  // 5. Recent File Activity Feed
  const { data: recentEvents = [] } = useQuery({
    queryKey: ['admin-recent-events'],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_activity')
        .select('*, profiles(display_name, email, role), files(name)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) return []
      return data
    },
  })

  const activeFiles = files.filter((f) => !f.deleted_at)
  const trashedFiles = files.filter((f) => f.deleted_at)
  const totalStorage = activeFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0)

  const adminCount = profiles.filter((p) => p.role === 'ADMIN').length
  const editorCount = profiles.filter((p) => p.role === 'EDITOR').length
  const viewerCount = profiles.filter((p) => p.role === 'VIEWER').length

  const roleDistributionData = [
    { name: 'Admin', count: adminCount, color: '#e11d48' },
    { name: 'Editors', count: editorCount, color: '#4f46e5' },
    { name: 'Viewers', count: viewerCount, color: '#64748b' },
  ]

  // Category file count distribution
  const categoryMap = {}
  activeFiles.forEach((f) => {
    const cat = f.category || 'General'
    categoryMap[cat] = (categoryMap[cat] || 0) + 1
  })
  const categoryChartData = Object.keys(categoryMap).map((k) => ({
    category: k,
    count: categoryMap[k],
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-rose-600 dark:text-rose-500" />
            Executive Administration Hub
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time platform governance, user presence, and storage monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Realtime Presence Active
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registered Users
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {profiles.length}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
            <span>Admin: <strong>{adminCount}</strong></span>
            <span>Editors: <strong>{editorCount}</strong></span>
            <span>Viewers: <strong>{viewerCount}</strong></span>
          </div>
        </div>

        {/* Online Users */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Currently Online
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {onlineUsersList.length}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Active heartbeats in previous 90 seconds
          </p>
        </div>

        {/* Active Files */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Documents
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {activeFiles.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Trash: {trashedFiles.length}</span>
            <Link to="/admin/trash" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Review Trash
            </Link>
          </div>
        </div>

        {/* Total Storage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Vault Storage Used
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatBytes(totalStorage)}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Encrypted object storage usage
          </p>
        </div>
      </div>

      {/* Live Current File Viewing Monitor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Active Document Viewing Sessions
              </h2>
              <p className="text-xs text-slate-400">
                Privacy-conscious monitor of users currently viewing files in real time
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {activeViewings.length} Active Viewer{activeViewings.length === 1 ? '' : 's'}
          </span>
        </div>

        {activeViewings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
            No users are currently viewing documents.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">User</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Document</th>
                  <th className="px-4 py-2.5 font-semibold">Viewing Since</th>
                  <th className="px-4 py-2.5 font-semibold">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeViewings.map((view, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {view.display_name || 'User'}
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleBadge role={view.role} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-indigo-600 dark:text-indigo-400">
                      {view.file_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {formatDate(view.viewing_since)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {formatDate(view.last_heartbeat_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics Charts & Role Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category Distribution Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Documents by Category
              </h2>
              <p className="text-xs text-slate-400">Total active repository file counts</p>
            </div>
            <Link
              to="/admin/analytics"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
            >
              Full Analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {categoryChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No document category data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Role Distribution Pie (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Role Distribution
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Single-Admin Invariant strictly preserved
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistributionData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={40}
                  >
                    {roleDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2 text-xs">
            {roleDistributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Platform Activity Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent Platform Operations
            </h2>
            <p className="text-xs text-slate-400">
              Real-time audit stream of document accesses, uploads, and downloads
            </p>
          </div>
          <Link
            to="/admin/activity"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
          >
            All Activity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No platform activity recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                      <strong>{evt.profiles?.display_name || evt.profiles?.email || 'User'}</strong>{' '}
                      performed <span className="font-semibold text-indigo-600 dark:text-indigo-400">{evt.event_type}</span>{' '}
                      on {evt.files?.name || evt.safe_metadata?.name || 'document'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDate(evt.created_at)}
                    </p>
                  </div>
                </div>

                <RoleBadge role={evt.profiles?.role} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
