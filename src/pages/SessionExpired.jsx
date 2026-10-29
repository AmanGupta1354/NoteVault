import { Link } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'

export default function SessionExpired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Clock className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Session Expired
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your authenticated session has timed out. Please sign in again to verify your identity and access your documents.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
          >
            <span>Sign In Again</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
