import { useState, useEffect } from 'react'
import { User, Mail, Shield, Clock, CheckCircle2, Loader2, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { RoleBadge, StatusBadge } from '@/components/common/Badge'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function Profile() {
  const { profile, refetchProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name)
  }, [profile])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      // Column update: only display_name can be updated by authenticated user
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', profile.id)

      if (error) throw error

      toast.success('Profile updated successfully')
      await refetchProfile()
    } catch (err) {
      toast.error('Failed to update profile: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Account & Security Profile
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Manage your personal details and view your platform security credentials
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Column: Avatar & Role Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-600/20">
            {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
            {profile?.display_name || 'NoteVault User'}
          </h2>
          <p className="text-xs text-slate-400 truncate">{profile?.email}</p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <RoleBadge role={profile?.role} />
            <StatusBadge status={profile?.status} />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-left dark:border-slate-800 text-xs space-y-2.5">
            <div className="flex items-center justify-between text-slate-500">
              <span>Member Since:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(profile?.created_at)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Last Login:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(profile?.last_login_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Profile Information
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 pl-9 pr-3.5 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Email is synchronized with your Supabase authentication identity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security policy card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Role & Permissions Guard
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your account currently holds the <strong className="text-indigo-600 dark:text-indigo-400">{profile?.role}</strong> role.
              In NoteVault, roles are enforced directly inside PostgreSQL Row-Level Security (RLS). Users cannot alter their own roles or bypass administrative boundaries. Role promotion and demotion are strictly restricted to the platform administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
