import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // 1. Initial session load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    // 2. Auth state change listener
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' && s) {
        void supabase.rpc('touch_login')
        queryClient.invalidateQueries({ queryKey: ['me'] })
      }
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [queryClient])

  // Profile query: ALWAYS queried directly from PostgreSQL profiles table
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['me', session?.user?.id],
    enabled: !!session?.user?.id,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      if (!session?.user?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      return data
    },
  })

  const signOut = async () => {
    try {
      const key = sessionStorage.getItem('nv_session')
      if (key) {
        await supabase.rpc('end_session', { p_session: key })
      }
    } catch {
      // Ignore session cleanup error on disconnect
    }
    await supabase.auth.signOut()
    setSession(null)
    queryClient.clear()
  }

  const value = {
    session,
    user: session?.user || null,
    profile: profile || null,
    loading: !ready || (!!session && isProfileLoading),
    refetchProfile,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
