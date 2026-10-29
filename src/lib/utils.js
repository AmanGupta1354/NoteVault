import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(dateString)
}

export function getFileCategory(mimeType, fileName = '') {
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return 'Document'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) return 'Spreadsheet'
  if (mimeType.includes('presentation') || fileName.endsWith('.pptx')) return 'Presentation'
  if (mimeType.startsWith('text/')) return 'Text'
  return 'Other'
}
