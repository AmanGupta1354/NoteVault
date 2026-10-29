import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Search,
  Trash2,
  Eye,
  Download,
  FolderOpen,
  Filter,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/lib/utils'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { toast } from 'sonner'

export default function AdminFiles() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [previewFile, setPreviewFile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['admin-files-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const filtered = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = categoryFilter === 'ALL' || f.category === categoryFilter
    return matchesSearch && matchesCat
  })

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
      toast.success(`"${deleteTarget.name}" moved to Trash`)
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-files-all'] })
    } catch (err) {
      toast.error('Deletion error: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <FolderOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Administrative File Operations
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Global document index with unrestricted supervisory deletion and inspection rights
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="ALL">All Categories</option>
          <option value="General">General</option>
          <option value="Finance">Finance</option>
          <option value="Legal">Legal</option>
          <option value="Technical">Technical</option>
          <option value="HR & Operations">HR & Operations</option>
          <option value="Marketing">Marketing</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Document</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Size</th>
                <th className="px-4 py-3.5">Uploaded</th>
                <th className="px-5 py-3.5 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 max-w-sm">
                        <p
                          onClick={() => setPreviewFile(file)}
                          className="truncate font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 cursor-pointer"
                        >
                          {file.name}
                        </p>
                        <p className="truncate text-xs text-slate-400 font-mono text-[10px]">
                          Path: {file.storage_path}
                        </p>
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
                        title="Move to Trash"
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

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Administrative File Trash"
        message={`Are you sure you want to move "${deleteTarget?.name}" to trash as Administrator?`}
        confirmText="Move to Trash"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
