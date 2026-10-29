import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Download,
  Eye,
  UploadCloud,
  Trash2,
  FileText,
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
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { supabase } from '@/lib/supabase'

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('7d') // '24h' | '7d' | '30d' | '90d'

  // Fetch all activities in time window
  const { data: activities = [], isLoading: actLoading } = useQuery({
    queryKey: ['admin-analytics-activity', period],
    queryFn: async () => {
      let days = 7
      if (period === '24h') days = 1
      else if (period === '30d') days = 30
      else if (period === '90d') days = 90

      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('file_activity')
        .select('*, files(name)')
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    },
  })

  // Fetch all profiles registered in time window
  const { data: profiles = [], isLoading: profLoading } = useQuery({
    queryKey: ['admin-analytics-profiles', period],
    queryFn: async () => {
      let days = 7
      if (period === '24h') days = 1
      else if (period === '30d') days = 30
      else if (period === '90d') days = 90

      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .select('id, created_at, role')
        .gte('created_at', sinceDate)

      if (error) throw error
      return data || []
    },
  })

  // Breakdown by event type
  const eventCounts = { UPLOADED: 0, VIEWED: 0, DOWNLOADED: 0, DELETED: 0, RESTORED: 0 }
  activities.forEach((a) => {
    if (eventCounts[a.event_type] !== undefined) {
      eventCounts[a.event_type]++
    }
  })

  const eventTypeChartData = [
    { name: 'Uploads', count: eventCounts.UPLOADED, color: '#3b82f6' },
    { name: 'Views', count: eventCounts.VIEWED, color: '#6366f1' },
    { name: 'Downloads', count: eventCounts.DOWNLOADED, color: '#10b981' },
    { name: 'Deletions', count: eventCounts.DELETED, color: '#f43f5e' },
    { name: 'Restorations', count: eventCounts.RESTORED, color: '#a855f7' },
  ]

  // Top accessed documents in this period
  const fileViewsMap = {}
  activities
    .filter((a) => a.event_type === 'VIEWED' || a.event_type === 'DOWNLOADED')
    .forEach((a) => {
      const name = a.files?.name || a.safe_metadata?.name || 'Document'
      fileViewsMap[name] = (fileViewsMap[name] || 0) + 1
    })

  const topFiles = Object.entries(fileViewsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Platform Telemetry & Analytics
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Empirical usage metrics, storage consumption, and interaction frequency
          </p>
        </div>

        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-xs self-start sm:self-auto">
          {['24h', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition-all ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Eye className="h-4 w-4 text-indigo-500" />
            File Previews
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {eventCounts.VIEWED}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Download className="h-4 w-4 text-emerald-500" />
            File Downloads
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {eventCounts.DOWNLOADED}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <UploadCloud className="h-4 w-4 text-blue-500" />
            Upload Events
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {eventCounts.UPLOADED}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Trash2 className="h-4 w-4 text-rose-500" />
            Deletions
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {eventCounts.DELETED}
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activity Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Operation Types Breakdown
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Proportion of document actions in selected interval ({period})
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventTypeChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Frequently Accessed Documents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Most Viewed & Downloaded Documents
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Ranked by interaction volume in selected interval ({period})
          </p>

          {topFiles.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              No document interactions during this time period
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {topFiles.map((f, i) => (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      {f.name}
                    </span>
                    <span className="font-mono text-slate-500">{f.count} actions</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (f.count / (topFiles[0].count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
