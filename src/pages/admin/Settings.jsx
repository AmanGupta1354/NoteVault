import { useState } from 'react'
import { Shield, Key, Database, HardDrive, CheckCircle2, Lock, Terminal } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from 'sonner'

export default function AdminSettings() {
  const { profile } = useAuth()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Platform Security & Environment Configuration
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Architecture parameters, storage limits, and single-admin enforcement verification
        </p>
      </div>

      {/* Single-Admin Invariant Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Single-Administrator Invariant Enforced
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enforced by database constraint: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">create unique index one_admin_only on public.profiles ((role)) where role = &apos;ADMIN&apos;;</code>.
              The database will reject any query attempting to add a second administrator. The administrative account cannot be demoted or deleted through the client API.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Active Administrator:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{profile?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage and Retention Rules */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <HardDrive className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Storage Encryption & Quota
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            All documents are stored within the private Supabase Storage bucket <code>vault</code>. Direct public URL access is permanently disabled.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
            <li>File size ceiling: 25 MB per object</li>
            <li>Signed URL expiration: 300 seconds</li>
            <li>Folder isolation: <code>&lt;uploader_id&gt;/...</code></li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Lock className="h-4 w-4 text-rose-600 dark:text-rose-500" />
            Row-Level Security (RLS)
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every table has PostgreSQL Row-Level Security enabled. Functions use <code>SECURITY DEFINER</code> with sanitized <code>search_path</code>.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
            <li>Viewers: SELECT active files, own profile, own activity</li>
            <li>Editors: INSERT own files, soft-delete own files</li>
            <li>Admin: Unrestricted delete, role promotion, audit access</li>
          </ul>
        </div>
      </div>

      {/* Operator Emergency Recovery Reference */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          <Terminal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          Operator-Only Admin Recovery Procedure
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
          Because the database protects the administrator account against demotion and suspension via client APIs, an authorized system operator can only perform administrative account recovery via trusted SQL:
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-[11px] text-slate-200 dark:bg-slate-950">
{`-- Run inside Supabase SQL Editor:
BEGIN;
SET LOCAL notevault.allow_admin_change = 'on';
UPDATE public.profiles SET role = 'VIEWER' WHERE role = 'ADMIN';
UPDATE public.profiles SET role = 'ADMIN', status = 'ACTIVE' WHERE email = 'new-admin@example.com';
COMMIT;`}
        </pre>
      </div>
    </div>
  )
}
