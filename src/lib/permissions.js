/**
 * UI permissions and navigation helpers
 * The database RLS is always the actual authority.
 */

export const can = {
  upload: (role) => role === 'ADMIN' || role === 'EDITOR',
  deleteFile: (role, uploaderId, currentUserId) =>
    role === 'ADMIN' || (role === 'EDITOR' && uploaderId === currentUserId),
  restoreFile: (role) => role === 'ADMIN',
  permanentDelete: (role) => role === 'ADMIN',
  manageUsers: (role) => role === 'ADMIN',
  viewAudit: (role) => role === 'ADMIN',
  viewAdminAnalytics: (role) => role === 'ADMIN',
}

export const homeFor = (role) => {
  if (role === 'ADMIN') return '/admin'
  if (role === 'EDITOR') return '/editor'
  return '/dashboard'
}
