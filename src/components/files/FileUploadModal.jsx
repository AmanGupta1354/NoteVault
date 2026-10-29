import { useState, useRef } from 'react'
import { UploadCloud, X, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatBytes } from '@/lib/utils'
import { toast } from 'sonner'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
]

const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export function FileUploadModal({ isOpen, onClose, currentFolderId = null, onUploadSuccess }) {
  const { session } = useAuth()
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [tagsInput, setTagsInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const validateAndSetFile = (selected) => {
    if (!selected) return

    if (selected.size > MAX_SIZE_BYTES) {
      toast.error(`File is too large (${formatBytes(selected.size)}). Max allowed is 25MB.`)
      return
    }

    // MIME type check
    const isAllowed =
      ALLOWED_MIME_TYPES.includes(selected.type) ||
      selected.name.endsWith('.pdf') ||
      selected.name.endsWith('.docx') ||
      selected.name.endsWith('.xlsx') ||
      selected.name.endsWith('.pptx') ||
      selected.name.endsWith('.csv') ||
      selected.name.endsWith('.txt')

    if (!isAllowed) {
      toast.error(`File format not supported. Supported: PDF, DOCX, XLSX, PPTX, CSV, TXT, PNG, JPG, WEBP.`)
      return
    }

    setFile(selected)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !session?.user?.id) return

    setUploading(true)
    setProgress(10)

    try {
      const uid = session.user.id
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      // Path must conform to storage RLS: `<uid>/<file-uuid>-<filename>`
      const fileId = crypto.randomUUID()
      const storagePath = `${uid}/${fileId}-${safeName}`

      setProgress(30)

      // 1. Upload to Supabase Storage private vault bucket
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        })

      if (uploadError) {
        throw new Error(uploadError.message || 'Storage upload rejected')
      }

      setProgress(70)

      // Process tags
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      // 2. Insert metadata record in PostgreSQL
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          id: fileId,
          name: file.name,
          description: description.trim() || null,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          category: category || 'General',
          tags: tags,
          uploaded_by: uid,
          is_folder: false,
          parent_id: currentFolderId || null,
        })
        .select()
        .single()

      if (dbError) {
        // Rollback storage file if database metadata insertion fails
        await supabase.storage.from('vault').remove([storagePath]).catch(() => {})
        throw new Error(dbError.message || 'Failed to record file metadata')
      }

      setProgress(100)
      toast.success(`"${file.name}" uploaded successfully!`)
      if (onUploadSuccess) onUploadSuccess(fileRecord)
      onClose()
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Upload New Document
              </h3>
              <p className="text-xs text-slate-500">
                Securely encrypted and stored in private vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="mt-4 space-y-4">
          {/* Dropzone */}
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) validateAndSetFile(e.target.files[0])
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Click to browse or drag file here
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF, DOCX, XLSX, PPTX, CSV, TXT, Images (Max 25MB)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-3 min-w-0">
                <File className="h-5 w-5 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={uploading}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Form Fields */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="General">General</option>
              <option value="Finance">Finance</option>
              <option value="Legal">Legal</option>
              <option value="Technical">Technical</option>
              <option value="HR & Operations">HR & Operations</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              placeholder="Add summary or notes about this file..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tags (Comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={uploading}
              placeholder="e.g. q4, budget, presentation"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Encrypting and uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
