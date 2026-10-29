import { useState, useEffect } from 'react'
import {
  X,
  Download,
  FileText,
  Clock,
  HardDrive,
  ExternalLink,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePresence } from '@/features/presence/usePresence'
import { formatBytes, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function FilePreviewModal({ file, isOpen, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Active viewing presence: reports this fileId to presence_sessions as long as modal is open
  usePresence(isOpen && file ? file.id : null)

  useEffect(() => {
    if (!isOpen || !file) {
      setSignedUrl(null)
      setTextContent('')
      setError(null)
      setZoom(100)
      setRotation(0)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)
    setZoom(100)
    setRotation(0)

    const initPreview = async () => {
      try {
        // Record VIEWED event safely without .catch()
        try {
          await supabase.rpc('record_file_event', {
            p_file: file.id,
            p_event: 'VIEWED',
          })
        } catch {
          // ignore tracking failure
        }

        // Generate short-lived signed URL (600 seconds / 10 mins)
        const { data, error: urlError } = await supabase.storage
          .from('vault')
          .createSignedUrl(file.storage_path, 600)

        if (urlError) throw urlError

        if (isMounted) {
          setSignedUrl(data.signedUrl)

          // If text or CSV or code, fetch content
          const isTextLike =
            file.mime_type.startsWith('text/') ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.txt') ||
            file.name.endsWith('.json') ||
            file.name.endsWith('.md')

          if (isTextLike) {
            const res = await fetch(data.signedUrl)
            const text = await res.text()
            if (isMounted) {
              setTextContent(text)
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Preview error:', err)
          setError(err.message || 'Failed to load preview.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initPreview()

    return () => {
      isMounted = false
    }
  }, [isOpen, file])

  const handleDownload = async () => {
    if (!file || !signedUrl) return
    try {
      try {
        await supabase.rpc('record_file_event', {
          p_file: file.id,
          p_event: 'DOWNLOADED',
        })
      } catch {}

      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
      toast.success(`Downloaded ${file.name}`)
    } catch (err) {
      toast.error('Download failed: ' + err.message)
    }
  }

  if (!isOpen || !file) return null

  const isImage = file.mime_type.startsWith('image/')
  const isPdf = file.mime_type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  const isText =
    file.mime_type.startsWith('text/') ||
    file.name.toLowerCase().endsWith('.txt') ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.json')

  const isOfficeDoc =
    file.name.endsWith('.docx') ||
    file.name.endsWith('.pptx') ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.doc') ||
    file.name.endsWith('.xls') ||
    file.name.endsWith('.ppt')

  // Parse CSV rows if csv
  const csvRows = isCsv && textContent
    ? textContent.trim().split('\n').map((row) => row.split(','))
    : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Google-Drive Style Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 sm:px-6 text-white z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20">
            {isPdf ? (
              <FileText className="h-5 w-5 text-rose-400" />
            ) : isImage ? (
              <FileText className="h-5 w-5 text-purple-400" />
            ) : isCsv ? (
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            ) : (
              <FileCode className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm sm:text-base font-semibold text-white">
              {file.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{file.category || 'General'}</span>
              <span>•</span>
              <span>{formatBytes(file.size_bytes)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Preview
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom controls for Images */}
          {isImage && (
            <div className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-mono">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(300, z + 25))}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white ml-1 border-l border-slate-700 pl-2"
                title="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Open in new tab */}
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pop-out
            </a>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={loading || !signedUrl}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ml-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Preview Viewing Stage */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-2 sm:p-6 bg-slate-950">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Loading Google Drive style preview...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 text-center max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/30">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <p className="text-sm font-medium text-white">Preview unavailable</p>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={handleDownload}
              className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Download File Directly
            </button>
          </div>
        )}

        {!loading && !error && signedUrl && (
          <div className="h-full w-full flex items-center justify-center overflow-auto">
            {/* 1. PDF Preview - Embedded native viewer with full scroll/zoom */}
            {isPdf && (
              <div className="h-full w-full max-w-6xl rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
                <iframe
                  src={`${signedUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  title={file.name}
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            )}

            {/* 2. Image Preview - Interactive zoom/pan/rotate */}
            {isImage && (
              <div className="h-full w-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={signedUrl}
                  alt={file.name}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                />
              </div>
            )}

            {/* 3. CSV Spreadsheet Interactive Preview */}
            {isCsv && csvRows.length > 0 && (
              <div className="h-full w-full max-w-6xl overflow-auto rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
                <table className="w-full text-left text-xs font-mono text-slate-300 divide-y divide-slate-800">
                  <thead className="bg-slate-800/80 sticky top-0">
                    <tr>
                      {csvRows[0].map((header, idx) => (
                        <th key={idx} className="p-2.5 font-bold text-white border-b border-slate-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {csvRows.slice(1, 200).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 text-slate-300 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Text / Code Document Preview */}
            {isText && !isCsv && (
              <div className="h-full w-full max-w-5xl rounded-xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-950/60 text-xs text-slate-400">
                  <span>Plaintext document viewer</span>
                  <span>{textContent.length} characters</span>
                </div>
                <pre className="flex-1 overflow-auto p-5 font-mono text-xs leading-relaxed text-slate-200 select-text">
                  {textContent || '(Empty file)'}
                </pre>
              </div>
            )}

            {/* 5. Office Documents (Word, Excel, PowerPoint) Fallback & Google Docs Viewer link */}
            {isOfficeDoc && (
              <div className="flex flex-col items-center gap-4 text-center max-w-lg p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {file.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    This file is encrypted and securely stored. Click below to download or view it with your preferred editor.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download ({formatBytes(file.size_bytes)})
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-white/10 bg-slate-900/90 px-6 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>Uploaded: {formatDate(file.created_at)}</span>
          <span>Size: {formatBytes(file.size_bytes)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">NoteVault Secure Vault Viewer</span>
        </div>
      </footer>
    </div>
  )
}
