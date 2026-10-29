import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, Filter, Loader2, FileText, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { RoleBadge } from '@/components/common/Badge'

export default function AdminActivity() {
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['admin-activity-all', eventTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('file_activity')
        .select('*, profiles(display_name, email, role), files(name, category)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (eventTypeFilter !== 'ALL') {
        query = query.eq('event_type', eventTypeFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const filtered = activities.filter((act) => {
    const userStr = (act.profiles?.display_name || '') + ' ' + (act.profiles?.email || '')
    const fileStr = act.files?.name || act.safe_metadata?.name || ''
    return (
      userStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fileStr.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Platform Operational Activity
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Chronological record of document uploads, view sessions, downloads, and deletions
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activity by user or file..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="ALL">All Event Types</option>
          <option value="UPLOADED">UPLOADED</option>
          <option value="VIEWED">VIEWED</option>
          <option value="DOWNLOADED">DOWNLOADED</option>
          <option value="DELETED">DELETED</option>
          <option value="RESTORED">RESTORED</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Activity className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-xs text-slate-400">No matching activities found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Event</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Target Document</th>
                <th className="px-4 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        act.event_type === 'UPLOADED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                          : act.event_type === 'DOWNLOADED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : act.event_type === 'DELETED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                          : act.event_type === 'RESTORED'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {act.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                    {act.profiles?.display_name || act.profiles?.email || 'System'}
                  </td>
                  <td className="px-4 py-3.5">
                    <RoleBadge role={act.profiles?.role} />
                  </td>
                  <td className="px-4 py-3.5 font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-xs">
                    {act.files?.name || act.safe_metadata?.name || 'Document'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(act.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
