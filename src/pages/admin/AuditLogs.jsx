import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, Search, Filter, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150)

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  const filtered = logs.filter((l) => {
    const metaStr = JSON.stringify(l.metadata || {})
    return (
      l.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.target_id && l.target_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      metaStr.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-500" />
          Security Audit Trail
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Immutable system log of authentication events, authorization denials, and role promotions
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event type, target, or metadata..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="ALL">All Outcomes</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-xs text-slate-400">No security audit logs found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Security Event</th>
                  <th className="px-4 py-3.5">Outcome</th>
                  <th className="px-4 py-3.5">Target Type / ID</th>
                  <th className="px-4 py-3.5">Audit Metadata</th>
                  <th className="px-5 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((log) => {
                  const isSuccess = log.status === 'SUCCESS'

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {log.event_type}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {log.target_type ? `${log.target_type}: ` : ''}
                        {log.target_id || 'N/A'}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500 max-w-xs truncate">
                        {JSON.stringify(log.metadata)}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap text-xs text-slate-500">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
