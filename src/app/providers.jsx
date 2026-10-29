import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { router } from './router'
import { isConfigured } from '@/lib/supabase'
import { Shield, Key, AlertCircle, ExternalLink, Terminal } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <Shield className="h-7 w-7" />
        </div>

        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          NoteVault Setup Required
        </h1>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The application requires Supabase credentials to establish encrypted authentication, Row-Level Security, and storage connectivity.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Create or edit your <code className="text-indigo-600 dark:text-indigo-400">.env</code> file:
          </p>
          <pre className="rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-200 dark:bg-slate-950 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
          </pre>
          <p className="text-[11px] text-slate-400">
            Then apply migrations: <code className="font-mono text-slate-700 dark:text-slate-300">supabase/migrations/20261029000001_core.sql</code>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Providers() {
  if (!isConfigured) {
    return <SetupNotice />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
