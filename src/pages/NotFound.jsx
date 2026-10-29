import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { homeFor } from '@/lib/permissions'

export default function NotFound() {
  const { profile } = useAuth()
  const home = homeFor(profile?.role)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <FileQuestion className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Page Not Found (404)
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The requested page or document link does not exist or has been moved.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            to={home}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Safety
          </Link>
        </div>
      </div>
    </div>
  )
}
