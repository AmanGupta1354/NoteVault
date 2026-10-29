import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const INTERVAL_MS = 30_000

const getSessionKey = () => {
  let key = sessionStorage.getItem('nv_session')
  if (!key) {
    key = crypto.randomUUID()
    sessionStorage.setItem('nv_session', key)
  }
  return key
}

/**
 * Hook to send periodic presence heartbeats.
 * Pass fileId when a file preview/modal is currently open.
 */
export function usePresence(fileId = null) {
  const { pathname } = useLocation()

  useEffect(() => {
    const sessionKey = getSessionKey()

    const beat = async () => {
      if (document.visibilityState === 'hidden' && !fileId) return
      try {
        await supabase.rpc('heartbeat', {
          p_session: sessionKey,
          p_page: pathname,
          p_file: fileId || null,
        })
      } catch {}
    }

    // Initial heartbeat
    beat()
    const timer = setInterval(beat, INTERVAL_MS)

    const onVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          await supabase.rpc('end_session', { p_session: sessionKey })
        } catch {}
      } else {
        beat()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (fileId) {
        // Clear viewing state when closing preview
        supabase.rpc('heartbeat', {
          p_session: sessionKey,
          p_page: pathname,
          p_file: null,
        }).then(() => {}, () => {})
      }
    }
  }, [pathname, fileId])
}
