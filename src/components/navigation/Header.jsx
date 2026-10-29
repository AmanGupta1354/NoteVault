import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  LogOut,
  User,
  Shield,
  Eye,
  Search,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { RoleBadge } from '@/components/common/Badge'

export function Header({ mobileMenuOpen, setMobileMenuOpen, onSearchOpen }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      {/* Left controls: Mobile menu toggle + Global Search trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onSearchOpen}
          className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-600 transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span>Quick search library...</span>
          <kbd className="ml-4 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-xs dark:bg-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right controls: Theme, Presence & User dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        {/* User menu dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-1.5 pl-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:inline-block max-w-[120px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
              {profile?.display_name || profile?.email}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100 z-50">
              <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.display_name || 'My Account'}
                </p>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                  {profile?.email}
                </p>
                <div className="mt-2">
                  <RoleBadge role={profile?.role} />
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/profile')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Account Profile
                </button>

                {profile?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false)
                      navigate('/admin')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                  >
                    <Shield className="h-4 w-4 text-indigo-500" />
                    Admin Panel
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
