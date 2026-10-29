import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, FileText, Eye, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatBytes, formatDate } from '@/lib/utils'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { toast } from 'sonner'

export default function Recent() {
  const { session } = useAuth()
  const [previewFile, setPreviewFile] = useState(null)
  const currentUid = session?.user?.id

  const { data: recentEvents = [], isLoading } = useQuery({
    queryKey: ['recent-user-files', currentUid],
    enabled: Boolean(currentUid),
    queryFn: async () => {
      // Query events from file_activity joined with files
      const { data, error } = await supabase
        .from('file_activity')
        .select('*, files(*)')
        .eq('user_id', currentUid)
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) throw error
      return data.filter((item) => item.files && !item.files.deleted_at)
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Recently Accessed Files
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          History of documents you have opened, previewed, or downloaded
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : recentEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Clock className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            No recent activity
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Files you interact with in the library will appear here for fast retrieval.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentEvents.map((item) => {
              const file = item.files
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {item.event_type}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.created_at)}</span>
                        <span>•</span>
                        <span>{formatBytes(file.size_bytes)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewFile(file)}
                      title="Preview"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      title="Download"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  )
}
