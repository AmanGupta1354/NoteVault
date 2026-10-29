import { useState, useEffect } from 'react'
import {
  X,
  Download,
  FileText,
  Clock,
  User,
  HardDrive,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePresence } from '@/features/presence/usePresence'
import { formatBytes, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function FilePreviewModal({ file, isOpen, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [textContent, setTextContent] = useState('')

  // Active viewing presence: reports this fileId to presence_sessions as long as modal is open!
  usePresence(isOpen && file ? file.id : null)

  useEffect(() => {
    if (!isOpen || !file) {
      setSignedUrl(null)
      setTextContent('')
      setError(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const initPreview = async () => {
      try {
        // Record VIEWED event
        void supabase.rpc('record_file_event', {
          p_file: file.id,
          p_event: 'VIEWED',
        }).catch(() => {})

        // Generate short-lived signed URL (300 seconds / 5 mins)
        const { data, error: urlError } = await supabase.storage
          .from('vault')
          .createSignedUrl(file.storage_path, 300)

        if (urlError) throw urlError

        if (isMounted) {
          setSignedUrl(data.signedUrl)

          // If text file or csv, fetch text preview
          if (file.mime_type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
            const res = await fetch(data.signedUrl)
            const text = await res.text()
            if (isMounted) {
              setTextContent(text.slice(0, 50000))
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Preview error:', err)
          setError(err.message || 'Failed to load preview.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initPreview()

    return () => {
      isMounted = false
    }
  }, [isOpen, file])

  const handleDownload = async () => {
    if (!file || !signedUrl) return
    try {
      void supabase.rpc('record_file_event', {
        p_file: file.id,
        p_event: 'DOWNLOADED',
      }).catch(() => {})

      // Download file using the signed url
      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
      toast.success(`Downloaded ${file.name}`)
    } catch (err) {
      toast.error('Download failed: ' + err.message)
    }
  }

  if (!isOpen || !file) return null

  const isImage = file.mime_type.startsWith('image/')
  const isPdf = file.mime_type === 'application/pdf'
  const isText = file.mime_type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                {file.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{file.category || 'General'}</span>
                <span>•</span>
                <span>{formatBytes(file.size_bytes)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading || !signedUrl}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Preview Body */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 dark:bg-slate-950/60 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs">Preparing secure preview...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 text-center max-w-md p-6">
              <AlertCircle className="h-10 w-10 text-rose-500" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Unable to load preview
              </p>
              <p className="text-xs text-slate-500">{error}</p>
              <button
                onClick={handleDownload}
                className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Download File Directly
              </button>
            </div>
          )}

          {!loading && !error && signedUrl && (
            <div className="h-full w-full flex items-center justify-center">
              {isImage && (
                <img
                  src={signedUrl}
                  alt={file.name}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-md"
                />
              )}

              {isPdf && (
                <iframe
                  src={signedUrl}
                  title={file.name}
                  className="h-full w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                />
              )}

              {isText && (
                <pre className="h-full w-full overflow-auto rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {textContent || 'Empty document.'}
                </pre>
              )}

              {!isImage && !isPdf && !isText && (
                <div className="flex flex-col items-center gap-4 text-center max-w-md p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Preview not available
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      This format ({file.mime_type}) cannot be rendered directly in the browser. Please download the file to inspect its contents.
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 shadow-xs"
                  >
                    <Download className="h-4 w-4" />
                    Download ({formatBytes(file.size_bytes)})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Uploaded: {formatDate(file.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              Size: {formatBytes(file.size_bytes)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Viewing Tracked
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
