import { api } from './apiClient'

export const classmateService = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.graduationYear) searchParams.set('graduationYear', params.graduationYear)
    if (params.sort) searchParams.set('sort', params.sort)
    const qs = searchParams.toString()
    const res = await api.get(`/api/classmates${qs ? '?' + qs : ''}`)
    return res?.classmates || []
  },

  getStats: () => api.get('/api/classmates/stats'),

  add: (formData) => api.post('/api/admin/classmates', formData),
  update: (id, formData) => api.put(`/api/admin/classmates/${id}`, formData),
  delete: (id) => api.delete(`/api/admin/classmates/${id}`),
  batchDelete: (ids) => api.post('/api/admin/classmates/batch-delete', { ids }),
}
