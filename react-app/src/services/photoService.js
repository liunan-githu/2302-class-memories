import { api } from './apiClient'

export const photoService = {
  getApproved: () => api.get('/api/photos'),
  getPending: () => api.get('/api/photos/pending'),
  getAll: () => api.get('/api/admin/photos'),
  getById: (id) => api.get(`/api/photos/${id}`),
  getAdminById: (id) => api.get(`/api/admin/photos/${id}`),
  getUserPhotos: () => api.get('/api/user/photos'),

  upload: (formData, onProgress) => api.upload('/api/photos/batch', formData, onProgress),

  approve: (id) => api.post(`/api/photos/${id}/approve`),
  reject: (id, reason) => api.post(`/api/photos/${id}/reject`, { reason }),
  delete: (id) => api.delete(`/api/photos/${id}`),
}
