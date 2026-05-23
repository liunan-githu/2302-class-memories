import { api } from './apiClient'

export const aboutService = {
  get: () => api.get('/api/about'),
  update: (data) => api.put('/api/admin/about', data),
}
