import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Clock,
  FolderOpen,
  ArrowRight,
  Eye,
  Download,
  Search,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { RoleBadge } from '@/components/common/Badge'
import { formatBytes, formatDate } from '@/lib/utils'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { toast } from 'sonner'

export default function ViewerDashboard() {
  const { profile, session } = useAuth()
  const [previewFile, setPreviewFile] = useState(null)
  const currentUid = session?.user?.id

  // Active files query
  const { data: recentFiles = [] } = useQuery({
    queryKey: ['viewer-recent-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) return []
      return data
    },
  })

  // Total count of files
  const { data: totalFilesCount = 0 } = useQuery({
    queryKey: ['viewer-total-files-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (error) return 0
      return count || 0
    },
  })

  // Current user's recent file activity
  const { data: myActivity = [] } = useQuery({
    queryKey: ['my-activity', currentUid],
    enabled: Boolean(currentUid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_activity')
        .select('*, files(name, mime_type)')
        .eq('user_id', currentUid)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) return []
      return data
    },
  })

  const handleDownload = async (file) => {
    try {
      try { await supabase.rpc() } catch {}

      const { data, error } = await supabase.storage
        .from('vault')
        .createSignedUrl(file.storage_path, 120)

      if (error) throw error

      const res = await fetch(data.signedUrl)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Downloaded ${file.name}`)
    } catch (err) {
      toast.error('Download failed: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <RoleBadge role={profile?.role || 'VIEWER'} />
            <span className="text-xs text-indigo-200">
              Verified Authenticated Session
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {profile?.display_name || 'Member'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-indigo-100 leading-relaxed">
            NoteVault provides direct, secure access to your organization&apos;s verified shared document library and knowledge base.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/files"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-50 shadow-sm transition-colors"
            >
              <FolderOpen className="h-4 w-4" />
              Browse Entire Library
            </Link>
            <Link
              to="/recent"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-xs"
            >
              <Clock className="h-4 w-4" />
              My History
            </Link>
          </div>
        </div>

        {/* Ambient background styling */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Available Documents
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalFilesCount}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            Across all organizational categories
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Your Access Level
          </p>
          <div className="mt-2">
            <RoleBadge role="VIEWER" />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Read-only preview and download rights
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Security Status
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Protected by PostgreSQL RLS
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Heartbeat active
          </p>
        </div>
      </div>

      {/* Content Split: Recently Added Documents & My Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recently Added Files (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recently Added Documents
              </h2>
              <p className="text-xs text-slate-400">
                Latest files uploaded to the shared repository
              </p>
            </div>
            <Link
              to="/files"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentFiles.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No documents available yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                >
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {file.category || 'General'} • {formatBytes(file.size_bytes)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <button
                      onClick={() => setPreviewFile(file)}
                      title="Preview"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      title="Download"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Activity Feed (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            My Recent Activity
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Your personal views and downloads
          </p>

          {myActivity.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No activity recorded yet. Browse files to start viewing.
            </p>
          ) : (
            <div className="space-y-3.5">
              {myActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {act.event_type} document
                    </p>
                    <p className="truncate text-slate-500 text-[11px]">
                      {act.files?.name || 'Document'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(act.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  )
}
