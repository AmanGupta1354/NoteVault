import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserX,
  Clock,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Eye,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RoleBadge, StatusBadge } from '@/components/common/Badge'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [onlineFilter, setOnlineFilter] = useState('ALL')

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null)
  const [drawerUser, setDrawerUser] = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // { type: 'ROLE', target: user, newRole: 'EDITOR' | 'VIEWER' } | { type: 'STATUS', target: user, newStatus: 'ACTIVE' | 'SUSPENDED' }
  const [actionLoading, setActionLoading] = useState(false)

  // 1. Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // 2. Fetch online users
  const { data: onlineList = [] } = useQuery({
    queryKey: ['admin-online-check'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('online_users', { p_window_seconds: 90 })
      if (error) return []
      return data || []
    },
  })

  const onlineUserIds = new Set(onlineList.map((u) => u.user_id))

  // Filter profiles
  const filteredUsers = profiles.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.display_name && user.display_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter

    const isOnline = onlineUserIds.has(user.id)
    const matchesOnline =
      onlineFilter === 'ALL' ||
      (onlineFilter === 'ONLINE' && isOnline) ||
      (onlineFilter === 'OFFLINE' && !isOnline)

    return matchesSearch && matchesRole && matchesStatus && matchesOnline
  })

  // Execute Role or Status Change
  const handleExecuteAction = async () => {
    if (!pendingAction) return
    setActionLoading(true)

    try {
      if (pendingAction.type === 'ROLE') {
        const { error } = await supabase.rpc('admin_set_role', {
          p_target: pendingAction.target.id,
          p_role: pendingAction.newRole,
        })
        if (error) throw error
        toast.success(`Role updated to ${pendingAction.newRole}`)
      } else if (pendingAction.type === 'STATUS') {
        const { error } = await supabase.rpc('admin_set_status', {
          p_target: pendingAction.target.id,
          p_status: pendingAction.newStatus,
        })
        if (error) throw error
        toast.success(`User status changed to ${pendingAction.newStatus}`)
      }

      setPendingAction(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] })
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
    } catch (err) {
      console.error('Action error:', err)
      toast.error(err.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          User Management & Access Control
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Govern authorization privileges, promote editors, and monitor active sessions
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email address..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin Only</option>
            <option value="EDITOR">Editors Only</option>
            <option value="VIEWER">Viewers Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Online Filter */}
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="ALL">All Presence</option>
            <option value="ONLINE">Online Now</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">User Profile</th>
                  <th className="px-4 py-3.5">Access Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Online Status</th>
                  <th className="px-4 py-3.5">Registered</th>
                  <th className="px-4 py-3.5">Last Login</th>
                  <th className="px-5 py-3.5 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const isOnline = onlineUserIds.has(user.id)
                  const isAdmin = user.role === 'ADMIN'

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div
                          onClick={() => setDrawerUser(user)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {user.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                              {user.display_name || 'Member'}
                            </p>
                            <p className="truncate text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Offline</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(user.last_login_at)}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isAdmin ? (
                          <span className="text-xs italic text-slate-400">
                            Primary Administrator
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Role change button */}
                            {user.role === 'VIEWER' ? (
                              <button
                                onClick={() =>
                                  setPendingAction({
                                    type: 'ROLE',
                                    target: user,
                                    newRole: 'EDITOR',
                                  })
                                }
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                              >
                                Promote to Editor
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setPendingAction({
                                    type: 'ROLE',
                                    target: user,
                                    newRole: 'VIEWER',
                                  })
                                }
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                Demote to Viewer
                              </button>
                            )}

                            {/* Suspend / Reactivate button */}
                            {user.status === 'ACTIVE' ? (
                              <button
                                onClick={() =>
                                  setPendingAction({
                                    type: 'STATUS',
                                    target: user,
                                    newStatus: 'SUSPENDED',
                                  })
                                }
                                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setPendingAction({
                                    type: 'STATUS',
                                    target: user,
                                    newStatus: 'ACTIVE',
                                  })
                                }
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={handleExecuteAction}
        title={
          pendingAction?.type === 'ROLE'
            ? `Confirm Role Change`
            : `Confirm Status Change`
        }
        message={
          pendingAction?.type === 'ROLE'
            ? `Are you sure you want to change ${pendingAction?.target?.email}'s role to ${pendingAction?.newRole}? This takes effect immediately at the database level and will be logged in the audit trail.`
            : `Are you sure you want to set ${pendingAction?.target?.email}'s status to ${pendingAction?.newStatus}? If suspended, active sessions will be terminated.`
        }
        confirmText="Confirm Change"
        danger={pendingAction?.newStatus === 'SUSPENDED' || pendingAction?.newRole === 'VIEWER'}
        isLoading={actionLoading}
      />

      {/* User Details Drawer */}
      {drawerUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border-l dark:border-slate-800 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                User Details Drawer
              </h3>
              <button
                onClick={() => setDrawerUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-md">
                  {drawerUser.display_name?.[0]?.toUpperCase() || drawerUser.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {drawerUser.display_name || 'Member'}
                  </h4>
                  <p className="text-slate-400">{drawerUser.email}</p>
                  <div className="mt-1 flex gap-2">
                    <RoleBadge role={drawerUser.role} />
                    <StatusBadge status={drawerUser.status} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Account ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                    {drawerUser.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {formatDate(drawerUser.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Login:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {formatDate(drawerUser.last_login_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Presence:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {onlineUserIds.has(drawerUser.id) ? 'Online Now' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Security Constraints
                </h5>
                <p className="text-slate-500 leading-relaxed">
                  Authentication tokens and passwords are not visible or retrievable. All role-based actions are guarded by PostgreSQL SECURITY DEFINER functions and recorded in the audit log.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
