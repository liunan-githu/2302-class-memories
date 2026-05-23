import { api } from './apiClient'

export const commentService = {
  getByVideo: (videoId) => api.get(`/api/videos/${videoId}/comments`),
  create: (videoId, content) => api.post(`/api/videos/${videoId}/comments`, { content }),
  delete: (commentId) => api.delete(`/api/comments/${commentId}`),
}
