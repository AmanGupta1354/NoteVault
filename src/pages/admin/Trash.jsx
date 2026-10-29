import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, RotateCcw, AlertTriangle, FileText, Loader2, HardDrive } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/lib/utils'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { toast } from 'sonner'

export default function AdminTrash() {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState(null)
  const [actionType, setActionType] = useState(null) // 'RESTORE' | 'PERMANENT'
  const [loading, setLoading] = useState(false)

  // Fetch trashed files (only visible to admin by RLS: `deleted_at is null or public.is_admin()`)
  const { data: trashedFiles = [], isLoading } = useQuery({
    queryKey: ['admin-trashed-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  const handleExecute = async () => {
    if (!selectedFile || !actionType) return
    setLoading(true)

    try {
      if (actionType === 'RESTORE') {
        // Restore: setting deleted_at to null triggers files_guard_trg & files_activity_trg ('RESTORED')
        const { error } = await supabase
          .from('files')
          .update({ deleted_at: null })
          .eq('id', selectedFile.id)

        if (error) throw error
        toast.success(`Restored "${selectedFile.name}" back to the active library`)
      } else if (actionType === 'PERMANENT') {
        // 1. Delete object from storage vault
        await supabase.storage.from('vault').remove([selectedFile.storage_path]).catch(() => {})

        // 2. Delete row from files table (guarded by files_delete RLS policy: admin + trashed only)
        const { error } = await supabase
          .from('files')
          .delete()
          .eq('id', selectedFile.id)

        if (error) throw error
        toast.success(`Permanently purged "${selectedFile.name}" from storage and database`)
      }

      setSelectedFile(null)
      setActionType(null)
      queryClient.invalidateQueries({ queryKey: ['admin-trashed-files'] })
      queryClient.invalidateQueries({ queryKey: ['files'] })
    } catch (err) {
      toast.error('Action failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Trash2 className="h-6 w-6 text-rose-600 dark:text-rose-500" />
          Trash & Document Retention Quarantine
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Restore soft-deleted files to the repository or permanently purge binary objects from storage
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : trashedFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Trash2 className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Trash is Empty
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            No soft-deleted files are awaiting recovery or purge.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Trashed File</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Deleted Timestamp</th>
                  <th className="px-5 py-3.5 text-right">Recovery Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trashedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 max-w-sm">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100 line-through">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono text-[10px]">
                            {file.storage_path}
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
                      {formatDate(file.deleted_at)}
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedFile(file)
                            setActionType('RESTORE')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>

                        <button
                          onClick={() => {
                            setSelectedFile(file)
                            setActionType('PERMANENT')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Purge Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(selectedFile && actionType)}
        onClose={() => {
          setSelectedFile(null)
          setActionType(null)
        }}
        onConfirm={handleExecute}
        title={actionType === 'RESTORE' ? 'Restore File' : 'Permanently Purge File'}
        message={
          actionType === 'RESTORE'
            ? `Restore "${selectedFile?.name}" back to the active library? All authorized viewers and editors will regain access immediately.`
            : `Are you sure you want to PERMANENTLY PURGE "${selectedFile?.name}"? The binary file will be removed from Supabase Storage and all database records will be erased. This action CANNOT be undone.`
        }
        confirmText={actionType === 'RESTORE' ? 'Restore Document' : 'Purge Permanently'}
        danger={actionType === 'PERMANENT'}
        isLoading={loading}
      />
    </div>
  )
}
