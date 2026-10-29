import { FileText, Eye, Download, Trash2, Clock, User, Tag } from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/utils'
import { can } from '@/lib/permissions'
import { useAuth } from '@/features/auth/AuthProvider'

export function FileCard({ file, onPreview, onDownload, onDelete }) {
  const { profile, session } = useAuth()
  const role = profile?.role
  const currentUid = session?.user?.id
  const canDelete = can.deleteFile(role, file.uploaded_by, currentUid)

  const isImage = file.mime_type?.startsWith('image/')
  const isPdf = file.mime_type === 'application/pdf'
  const isDoc = file.mime_type?.includes('word') || file.name.endsWith('.docx')
  const isSheet = file.mime_type?.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')

  const getBadgeColor = () => {
    if (isImage) return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900'
    if (isPdf) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900'
    if (isDoc) return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900'
    if (isSheet) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
    return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        {/* Top bar with Category & Size */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getBadgeColor()}`}>
            {file.category || 'General'}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {formatBytes(file.size_bytes)}
          </span>
        </div>

        {/* Icon & Title */}
        <div
          onClick={() => onPreview(file)}
          className="mt-3.5 flex items-start gap-3 cursor-pointer"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-950/50 dark:group-hover:text-indigo-400 transition-colors">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400 transition-colors">
              {file.name}
            </h4>
            {file.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                {file.description}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-400">No description</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {file.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                <Tag className="h-2.5 w-2.5 text-slate-400" />
                {tag}
              </span>
            ))}
            {file.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">+{file.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Action buttons */}
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1 truncate text-[11px]">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatDate(file.created_at)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPreview(file)}
              title="Preview file"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDownload(file)}
              title="Download file"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(file)}
                title="Move to trash"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
