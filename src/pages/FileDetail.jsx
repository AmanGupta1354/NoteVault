import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Download,
  Trash2,
  Clock,
  HardDrive,
  User,
  Tag,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { can } from '@/lib/permissions'
import { formatBytes, formatDate } from '@/lib/utils'
import { usePresence } from '@/features/presence/usePresence'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { toast } from 'sonner'

export default function FileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, session } = useAuth()
  const role = profile?.role
  const currentUid = session?.user?.id

  const [signedUrl, setSignedUrl] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Report active viewing presence while on this file's detail page!
  usePresence(id)

  const { data: file, isLoading, error } = useQuery({
    queryKey: ['file', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  // Also query recent events for this file
  const { data: activity = [] } = useQuery({
    queryKey: ['file-activity', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_activity')
        .select('*')
        .eq('file_id', id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) return []
      return data
    },
  })

  useEffect(() => {
    if (!file) return

    // Record VIEWED event
    void supabase.rpc('record_file_event', {
      p_file: file.id,
      p_event: 'VIEWED',
    }).catch(() => {})

    // Generate short-lived signed URL
    supabase.storage
      .from('vault')
      .createSignedUrl(file.storage_path, 300)
      .then(({ data }) => {
        if (data?.signedUrl) setSignedUrl(data.signedUrl)
      })
  }, [file])

  const handleDownload = async () => {
    if (!file || !signedUrl) return
    try {
      void supabase.rpc('record_file_event', {
        p_file: file.id,
        p_event: 'DOWNLOADED',
      }).catch(() => {})

      const response = await fetch(signedUrl)
      const blob = await response.blob()
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

  const handleDelete = async () => {
    if (!file) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', file.id)

      if (error) throw error
      toast.success('File moved to trash')
      navigate('/files')
    } catch (err) {
      toast.error('Failed to delete file: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/30">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
          Document not found
        </h3>
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          This document may have been removed or you do not have permission to view it.
        </p>
        <Link
          to="/files"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to library
        </Link>
      </div>
    )
  }

  const canDelete = can.deleteFile(role, file.uploaded_by, currentUid)
  const isImage = file.mime_type?.startsWith('image/')
  const isPdf = file.mime_type === 'application/pdf'

  return (
    <div className="space-y-6">
      {/* Top back link and actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/files"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={!signedUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Trash
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Preview area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Document Preview
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </span>
            </div>

            <div className="mt-4 flex min-h-[420px] items-center justify-center rounded-xl bg-slate-100 p-2 dark:bg-slate-950">
              {signedUrl && isImage && (
                <img
                  src={signedUrl}
                  alt={file.name}
                  className="max-h-[500px] max-w-full rounded-lg object-contain shadow-xs"
                />
              )}

              {signedUrl && isPdf && (
                <iframe
                  src={signedUrl}
                  title={file.name}
                  className="h-[520px] w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                />
              )}

              {signedUrl && !isImage && !isPdf && (
                <div className="text-center p-8">
                  <FileText className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Preview not available inline
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Format: {file.mime_type}
                  </p>
                  <button
                    onClick={handleDownload}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Download to Open
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Metadata and Recent Activity */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              File Information
            </h3>

            <div>
              <p className="text-xs text-slate-400">Document Name</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">
                {file.name}
              </p>
            </div>

            {file.description && (
              <div>
                <p className="text-xs text-slate-400">Description</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {file.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <p className="text-slate-400">Category</p>
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {file.category || 'General'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">File Size</p>
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatBytes(file.size_bytes)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Uploaded</p>
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatDate(file.created_at)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Active
                </p>
              </div>
            </div>

            {file.tags && file.tags.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {file.tags.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity on this file */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Document Audit History
            </h3>

            {activity.length === 0 ? (
              <p className="text-xs text-slate-400">No events logged yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {act.event_type}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {formatDate(act.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Move to Trash"
        message="Are you sure you want to soft-delete this file? Administrators can recover it from Trash."
        confirmText="Move to Trash"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
