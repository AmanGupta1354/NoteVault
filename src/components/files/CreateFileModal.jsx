import { useState } from 'react'
import { FilePlus, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from 'sonner'

export function CreateFileModal({ isOpen, onClose, currentFolderId = null, onCreated }) {
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !session?.user?.id) return

    setLoading(true)
    try {
      let fileName = name.trim()
      if (!fileName.includes('.')) {
        fileName = `${fileName}.txt`
      }

      const fileId = crypto.randomUUID()
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${session.user.id}/${fileId}-${safeName}`

      // Create blob from text content
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(storagePath, blob, {
          contentType: 'text/plain',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // 2. Insert metadata into files table
      const { data, error: dbError } = await supabase
        .from('files')
        .insert({
          id: fileId,
          name: fileName,
          description: 'Document created in NoteVault',
          storage_path: storagePath,
          mime_type: 'text/plain',
          size_bytes: blob.size,
          category,
          is_folder: false,
          parent_id: currentFolderId || null,
          uploaded_by: session.user.id,
        })
        .select()
        .single()

      if (dbError) {
        await supabase.storage.from('vault').remove([storagePath]).catch(() => {})
        throw dbError
      }

      toast.success(`Document "${fileName}" created successfully!`)
      setName('')
      setContent('')
      if (onCreated) onCreated(data)
      onClose()
    } catch (err) {
      toast.error('Failed to create file: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Create New Document / Note
              </h3>
              <p className="text-xs text-slate-500">
                Write a text document directly inside the vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. meeting-notes.txt"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              File Content
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type or paste your document notes here..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating Document...' : 'Save Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
