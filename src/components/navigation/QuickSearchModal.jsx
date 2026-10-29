import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, ArrowRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatBytes } from '@/lib/utils'

export function QuickSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      return
    }

    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('files')
          .select('id, name, mime_type, size_bytes, category, created_at')
          .is('deleted_at', null)
          .ilike('name', `%${query.trim()}%`)
          .limit(8)

        if (!error && data) {
          setResults(data)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 overflow-hidden">
        <div className="flex items-center border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type file name to search..."
            className="flex-1 border-0 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <p className="p-4 text-center text-xs text-slate-500">Searching library...</p>
          )}

          {!loading && query && results.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              No files found matching &quot;{query}&quot;
            </p>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onClose()
                    navigate(`/files/${file.id}`)
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {file.category || 'General'} • {formatBytes(file.size_bytes)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-6 text-center text-xs text-slate-400">
              Type keywords to search through shared documents in real-time.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
