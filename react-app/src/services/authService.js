import { api } from './apiClient'
import { storage } from '../utils/storage'

export const authService = {
  async login(username, password) {
    const data = await api.post('/api/login', { username, password })
    storage.setToken(data.token)
    storage.setUser(data.user)
    return data
  },

  async register(username, password) {
    const data = await api.post('/api/register', { username, password })
    storage.setToken(data.token)
    storage.setUser(data.user)
    return data
  },

  logout() {
    storage.remove('token')
    storage.remove('user')
    storage.remove('permissions')
  },

  async getUserStatus() {
    return api.get('/api/user/status')
  },

  async getUserPermissions() {
    return api.get('/api/user/permissions')
  },
}
