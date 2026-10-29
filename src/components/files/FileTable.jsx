import { FileText, Eye, Download, Trash2, Clock, Folder } from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/utils'
import { can } from '@/lib/permissions'
import { useAuth } from '@/features/auth/AuthProvider'

export function FileTable({ files, onOpenFolder, onPreview, onDownload, onDelete }) {
  const { profile, session } = useAuth()
  const role = profile?.role
  const currentUid = session?.user?.id

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Name</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Size</th>
              <th className="px-4 py-3.5">Uploaded</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {files.map((file) => {
              const canDelete = can.deleteFile(role, file.uploaded_by, currentUid)
              const isFolder = Boolean(file.is_folder || file.mime_type === 'application/vnd.notevault.folder')

              const handleRowClick = () => {
                if (isFolder) {
                  if (onOpenFolder) onOpenFolder(file)
                } else {
                  if (onPreview) onPreview(file)
                }
              }

              return (
                <tr
                  key={file.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={handleRowClick}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl cursor-pointer transition-colors ${
                          isFolder
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400'
                        }`}
                      >
                        {isFolder ? <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-md">
                        <p
                          onClick={handleRowClick}
                          className={`truncate font-medium cursor-pointer ${
                            isFolder
                              ? 'text-slate-900 hover:text-amber-600 dark:text-slate-100 dark:hover:text-amber-400'
                              : 'text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400'
                          }`}
                        >
                          {file.name}
                        </p>
                        {file.description && (
                          <p className="truncate text-xs text-slate-400">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {isFolder ? 'Folder' : (file.category || 'General')}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                    {isFolder ? '—' : formatBytes(file.size_bytes)}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                    {formatDate(file.created_at)}
                  </td>

                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {!isFolder && (
                        <>
                          <button
                            onClick={() => onPreview(file)}
                            title="Preview"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDownload(file)}
                            title="Download"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(file)}
                          title={isFolder ? "Delete folder" : "Trash file"}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
