import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UploadCloud,
  FileText,
  Plus,
  Eye,
  Download,
  Trash2,
  Search,
  Filter,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatBytes, formatDate } from '@/lib/utils'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { FileUploadModal } from '@/components/files/FileUploadModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { toast } from 'sonner'

export default function EditorUploads() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const currentUid = session?.user?.id

  const [search, setSearch] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['editor-uploads', currentUid],
    enabled: Boolean(currentUid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('uploaded_by', currentUid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

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
      queryClient.invalidateQueries({ queryKey: ['editor-uploads'] })
    } catch (err) {
      toast.error('Deletion failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <UploadCloud className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            My Uploaded Documents
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Review and manage all documents published under your account
          </p>
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter your uploads..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 shadow-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileText className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            No documents found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {search ? 'Try another search term.' : 'Upload your first document to see it listed here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Document</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Size</th>
                <th className="px-4 py-3.5">Upload Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 max-w-sm">
                        <p
                          onClick={() => setPreviewFile(file)}
                          className="truncate font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          {file.name}
                        </p>
                        {file.description && (
                          <p className="truncate text-xs text-slate-400">{file.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {file.category || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {formatBytes(file.size_bytes)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
      />

      <FileUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['editor-uploads'] })}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Move to Trash"
        message={`Are you sure you want to move "${deleteTarget?.name}" to trash?`}
        confirmText="Move to Trash"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
