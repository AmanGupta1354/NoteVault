import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/utils'

export default function EditorActivity() {
  const { session } = useAuth()
  const currentUid = session?.user?.id

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['editor-full-activity', currentUid],
    enabled: Boolean(currentUid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_activity')
        .select('*, files(name, category, size_bytes)')
        .eq('user_id', currentUid)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Editor Activity Journal
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Chronological record of your document uploads, previews, and removals
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Activity className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            No activity logged yet
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Events will be recorded as you publish and interact with documents.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {act.event_type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(act.created_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {act.files?.name || act.safe_metadata?.name || 'Document'}
                    </p>
                  </div>
                </div>

                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Logged
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
