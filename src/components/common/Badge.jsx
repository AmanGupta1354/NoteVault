import { cn } from '@/lib/utils'

export function RoleBadge({ role }) {
  const styles = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    EDITOR: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
    VIEWER: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
        styles[role] || styles.VIEWER
      )}
    >
      {role}
    </span>
  )
}

export function StatusBadge({ status }) {
  const isSuspended = status === 'SUSPENDED'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        isSuspended
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          isSuspended ? 'bg-amber-500' : 'bg-emerald-500'
        )}
      />
      {status || 'ACTIVE'}
    </span>
  )
}
