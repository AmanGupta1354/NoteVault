import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen,
  LayoutGrid,
  List,
  Search,
  Filter,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { can } from '@/lib/permissions'
import { FileCard } from '@/components/files/FileCard'
import { FileTable } from '@/components/files/FileTable'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { FileUploadModal } from '@/components/files/FileUploadModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { toast } from 'sonner'

export default function Files() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const role = profile?.role

  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('created_at_desc')

  // Modals state
  const [previewFile, setPreviewFile] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch active shared files
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['files', selectedCategory, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)

      if (selectedCategory !== 'ALL') {
        query = query.eq('category', selectedCategory)
      }

      if (sortBy === 'created_at_desc') query = query.order('created_at', { ascending: false })
      else if (sortBy === 'created_at_asc') query = query.order('created_at', { ascending: true })
      else if (sortBy === 'name_asc') query = query.order('name', { ascending: true })
      else if (sortBy === 'size_desc') query = query.order('size_bytes', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Filter client-side by search term
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.tags && f.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())))
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
      // Soft deletion: marks deleted_at timestamp
      // Database files_guard trigger ensures deleted_by = auth.uid() automatically
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteTarget.id)

      if (error) throw error

      toast.success(`"${deleteTarget.name}" moved to Trash`)
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['files'] })
    } catch (err) {
      toast.error('Deletion failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            File Library
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Secure enterprise repository of centralized documents and resources
          </p>
        </div>

        {can.upload(role) && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, description, or tags..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="created_at_desc">Newest First</option>
            <option value="created_at_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="size_desc">Largest Size</option>
          </select>

          {/* Grid/Table View Mode */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs">Loading documents...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/30">
          <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
          <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            Error loading files
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error.message}</p>
        </div>
      )}

      {!isLoading && !error && filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            No files found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchTerm
              ? `No documents matched "${searchTerm}"`
              : 'There are currently no active files in this category.'}
          </p>
          {can.upload(role) && !searchTerm && (
            <button
              onClick={() => setUploadOpen(true)}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 shadow-xs"
            >
              Upload First Document
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && filteredFiles.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onPreview={(f) => setPreviewFile(f)}
                  onDownload={handleDownload}
                  onDelete={(f) => setDeleteTarget(f)}
                />
              ))}
            </div>
          ) : (
            <FileTable
              files={filteredFiles}
              onPreview={(f) => setPreviewFile(f)}
              onDownload={handleDownload}
              onDelete={(f) => setDeleteTarget(f)}
            />
          )}
        </>
      )}

      {/* Modals */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
      />

      <FileUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['files'] })}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Move File to Trash"
        message={`Are you sure you want to move "${deleteTarget?.name}" to trash? The file will be soft-deleted and can be recovered by an administrator.`}
        confirmText="Move to Trash"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
