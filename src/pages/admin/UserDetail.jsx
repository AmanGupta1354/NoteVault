import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, Shield, Clock, Activity, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RoleBadge, StatusBadge } from '@/components/common/Badge'
import { formatDate } from '@/lib/utils'

export default function AdminUserDetail() {
  const { id } = useParams()

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: userActivity = [] } = useQuery({
    queryKey: ['admin-user-act', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_activity')
        .select('*, files(name)')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) return []
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        User profile not found.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to User Directory
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-md">
            {user.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {user.display_name || 'Member'}
            </h1>
            <p className="text-xs text-slate-400">{user.email}</p>
            <div className="mt-2 flex gap-2">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Recent User Activity Log
        </h2>

        {userActivity.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No activity recorded for this user yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {userActivity.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {act.event_type}
                  </span>{' '}
                  <span className="text-slate-500">
                    {act.files?.name || 'Document'}
                  </span>
                </div>
                <span className="text-slate-400">{formatDate(act.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
