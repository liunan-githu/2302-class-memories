import { api } from './apiClient'

export const videoService = {
  getApproved: () => api.get('/api/videos'),
  getById: (id) => api.get(`/api/videos/${id}`),
  getPending: () => api.get('/api/videos/pending'),
  getAll: () => api.get('/api/admin/videos'),
  getUserVideos: () => api.get('/api/user/videos'),
  getQualities: (id) => api.get(`/api/videos/${id}/qualities`),

  upload: (formData, onProgress) => api.upload('/api/upload', formData, onProgress),

  like: (id) => api.post(`/api/videos/${id}/like`),
  approve: (id) => api.post(`/api/videos/${id}/approve`),
  reject: (id, reason) => api.post(`/api/videos/${id}/reject`, { reason }),
  delete: (id) => api.delete(`/api/videos/${id}`),
  transcode: (id) => api.post(`/api/videos/${id}/transcode`),
  getTranscodeStatus: () => api.get('/api/admin/transcode/status'),
  getUserTranscodeStatus: () => api.get('/api/user/transcode/status'),
}
