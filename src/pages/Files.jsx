import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen,
  LayoutGrid,
  List,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  FolderPlus,
  FilePlus,
  UploadCloud,
  ChevronRight,
  Folder,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { can } from '@/lib/permissions'
import { FileCard } from '@/components/files/FileCard'
import { FileTable } from '@/components/files/FileTable'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'
import { FileUploadModal } from '@/components/files/FileUploadModal'
import { CreateFolderModal } from '@/components/files/CreateFolderModal'
import { CreateFileModal } from '@/components/files/CreateFileModal'
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

  // Folder navigation hierarchy state: [{ id: null, name: 'Root' }, { id: '...', name: 'Folder Name' }]
  const [folderPath, setFolderPath] = useState([{ id: null, name: 'Root' }])
  const currentFolder = folderPath[folderPath.length - 1]

  // Modals state
  const [previewFile, setPreviewFile] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createFileOpen, setCreateFileOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch active shared files and folders
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['files', selectedCategory, sortBy, currentFolder.id],
    queryFn: async () => {
      let query = supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)

      // Filter by folder parent_id
      if (currentFolder.id) {
        query = query.eq('parent_id', currentFolder.id)
      } else {
        query = query.is('parent_id', null)
      }

      if (selectedCategory !== 'ALL') {
        query = query.eq('category', selectedCategory)
      }

      if (sortBy === 'created_at_desc') query = query.order('created_at', { ascending: false })
      else if (sortBy === 'created_at_asc') query = query.order('created_at', { ascending: true })
      else if (sortBy === 'name_asc') query = query.order('name', { ascending: true })
      else if (sortBy === 'size_desc') query = query.order('size_bytes', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      // Sort so folders always appear first
      return (data || []).sort((a, b) => {
        const aFolder = Boolean(a.is_folder || a.mime_type === 'application/vnd.notevault.folder')
        const bFolder = Boolean(b.is_folder || b.mime_type === 'application/vnd.notevault.folder')
        if (aFolder && !bFolder) return -1
        if (!aFolder && bFolder) return 1
        return 0
      })
    },
  })

  // Filter client-side by search term
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.tags && f.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const handleOpenFolder = (folder) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  const handleNavigateBreadcrumb = (index) => {
    setFolderPath((prev) => prev.slice(0, index + 1))
  }

  const handleDownload = async (file) => {
    try {
      void supabase.rpc('record_file_event', {
        p_file: file.id,
        p_event: 'DOWNLOADED',
      })

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
            Secure enterprise repository of centralized folders, notes, and documents
          </p>
        </div>

        {/* Action Buttons for Authorized Writers (Admin & Editor) */}
        {can.upload(role) && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* 1. Create Folder */}
            <button
              type="button"
              onClick={() => setCreateFolderOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-xs transition-colors"
            >
              <FolderPlus className="h-4 w-4 text-amber-500" />
              New Folder
            </button>

            {/* 2. Create Note/Document */}
            <button
              type="button"
              onClick={() => setCreateFileOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-xs transition-colors"
            >
              <FilePlus className="h-4 w-4 text-indigo-500" />
              Create File
            </button>

            {/* 3. Upload File */}
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Document
            </button>
          </div>
        )}
      </div>

      {/* Folder Breadcrumb Navigation */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-100/70 p-2 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
        {folderPath.length > 1 && (
          <button
            onClick={() => handleNavigateBreadcrumb(folderPath.length - 2)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 transition-colors mr-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}

        {folderPath.map((item, index) => {
          const isLast = index === folderPath.length - 1
          return (
            <div key={index} className="flex items-center gap-1 shrink-0">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              <button
                disabled={isLast}
                onClick={() => handleNavigateBreadcrumb(index)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors ${
                  isLast
                    ? 'font-bold text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {index === 0 ? <Folder className="h-3.5 w-3.5" /> : null}
                <span>{item.name}</span>
              </button>
            </div>
          )
        })}
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
            placeholder="Search within this folder..."
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
          <p className="text-xs">Loading contents...</p>
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
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            This folder is empty
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchTerm
              ? `No items matched "${searchTerm}"`
              : 'Create a new folder, create a text note, or upload documents here.'}
          </p>

          {can.upload(role) && !searchTerm && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setCreateFolderOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <FolderPlus className="h-4 w-4 text-amber-500" />
                New Folder
              </button>
              <button
                onClick={() => setCreateFileOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <FilePlus className="h-4 w-4 text-indigo-500" />
                Create File
              </button>
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
              >
                <UploadCloud className="h-4 w-4" />
                Upload Document
              </button>
            </div>
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
                  onOpenFolder={handleOpenFolder}
                  onPreview={(f) => setPreviewFile(f)}
                  onDownload={handleDownload}
                  onDelete={(f) => setDeleteTarget(f)}
                />
              ))}
            </div>
          ) : (
            <FileTable
              files={filteredFiles}
              onOpenFolder={handleOpenFolder}
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
        currentFolderId={currentFolder.id}
        onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['files'] })}
      />

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        currentFolderId={currentFolder.id}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['files'] })}
      />

      <CreateFileModal
        isOpen={createFileOpen}
        onClose={() => setCreateFileOpen(false)}
        currentFolderId={currentFolder.id}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['files'] })}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget?.is_folder ? "Move Folder to Trash" : "Move File to Trash"}
        message={`Are you sure you want to move "${deleteTarget?.name}" to trash?`}
        confirmText="Move to Trash"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
