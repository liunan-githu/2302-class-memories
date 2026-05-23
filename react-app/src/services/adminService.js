import { api } from './apiClient'

export const adminService = {
  // Users
  getAllUsers: () => api.get('/api/admin/users/all'),
  banUser: (id, reason) => api.post(`/api/admin/user/${id}/ban`, { reason }),
  unbanUser: (id) => api.post(`/api/admin/user/${id}/unban`),
  disableUpload: (id, reason) => api.post(`/api/admin/user/${id}/disable-upload`, { reason }),
  enableUpload: (id) => api.post(`/api/admin/user/${id}/enable-upload`),
  updatePermissions: (id, permissions) => api.put(`/api/admin/users/${id}/permissions`, { permissions }),
  promoteUser: (id) => api.post(`/api/admin/users/${id}/promote`),
  demoteUser: (id) => api.post(`/api/admin/users/${id}/demote`),

  // Permissions & Audit
  getPermissionTemplates: () => api.get('/api/admin/permissions'),
  getAuditLogs: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.action) sp.set('action', params.action)
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    const qs = sp.toString()
    return api.get(`/api/admin/audit-logs${qs ? '?' + qs : ''}`)
  },

  // Debug
  getDbDump: () => api.get('/api/debug/db'),
}
