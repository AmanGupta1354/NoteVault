import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { homeFor } from '@/lib/permissions'

export default function AccessDenied() {
  const { profile } = useAuth()
  const home = homeFor(profile?.role)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Access Denied (403)
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          You do not have the required role privileges to access this administrative resource. This security check is enforced both client-side and at the database RLS level.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            to={home}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Authorized Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
