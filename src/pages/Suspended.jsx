import { Ban, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useNavigate } from 'react-router-dom'

export default function Suspended() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <Ban className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account Suspended
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your NoteVault account has been temporarily suspended by the system administrator. All file access, uploads, and downloads have been locked.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Please contact your administrator if you believe this is in error.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
