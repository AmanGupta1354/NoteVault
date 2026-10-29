import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UploadCloud,
  FolderOpen,
  FileText,
  Clock,
  HardDrive,
  Plus,
  Eye,
  Download,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { RoleBadge } from '@/components/common/Badge'
import { formatBytes, formatDate } from '@/lib/utils'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { FileUploadModal } from '@/components/files/FileUploadModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { toast } from 'sonner'

export default function EditorDashboard() {
  const { profile, session } = useAuth()
  const queryClient = useQueryClient()
  const currentUid = session?.user?.id

  const [previewFile, setPreviewFile] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // My uploaded files
  const { data: myFiles = [] } = useQuery({
    queryKey: ['editor-my-files', currentUid],
    enabled: Boolean(currentUid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('uploaded_by', currentUid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) return []
      return data
    },
  })

  // My recent activities
  const { data: myActivity = [] } = useQuery({
    queryKey: ['editor-my-activity', currentUid],
    enabled: Boolean(currentUid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_activity')
        .select('*, files(name)')
        .eq('user_id', currentUid)
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) return []
      return data
    },
  })

  const totalBytesUploaded = myFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0)

  const handleDownload = async (file) => {
    try {
      void supabase.rpc('record_file_event', {
        p_file: file.id,
        p_event: 'DOWNLOADED',
      }).catch(() => {})

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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteTarget.id)

      if (error) throw error
      toast.success('File moved to trash')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['editor-my-files'] })
    } catch (err) {
      toast.error('Deletion error: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Quick Upload */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RoleBadge role="EDITOR" />
            <span className="text-xs text-slate-400">Publisher Privileges</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Editor Workspace
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Publish, manage, and monitor documents in the corporate repository
          </p>
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Upload New Document
        </button>
      </div>

      {/* Editor KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              My Active Uploads
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <UploadCloud className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {myFiles.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Published by you to the repository
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Storage Consumed
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatBytes(totalBytesUploaded)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Encrypted in private storage vault
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Shared Library
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <Link
            to="/files"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Browse all shared files
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-1 text-[11px] text-slate-400">
            View enterprise library documents
          </p>
        </div>
      </div>

      {/* Split: My Uploads & My Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My Uploads (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                My Recent Uploads
              </h2>
              <p className="text-xs text-slate-400">
                Manage documents you have contributed
              </p>
            </div>
            <Link
              to="/editor/uploads"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
            >
              Manage all ({myFiles.length})
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {myFiles.length === 0 ? (
            <div className="py-12 text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs text-slate-400">
                You haven&apos;t uploaded any documents yet.
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myFiles.slice(0, 6).map((file) => (
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
                    <button
                      onClick={() => setDeleteTarget(file)}
                      title="Trash file"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Activity Feed (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                My Activity
              </h2>
              <p className="text-xs text-slate-400">Recent events log</p>
            </div>
            <Link
              to="/editor/activity"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
            >
              Full Log
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {myActivity.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No activity recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {myActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {act.event_type}
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

      <FileUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['editor-my-files'] })}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Move File to Trash"
        message={`Are you sure you want to move "${deleteTarget?.name}" to trash? You can re-upload if needed, or an admin can recover it.`}
        confirmText="Move to Trash"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
