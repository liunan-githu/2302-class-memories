export const storage = {
  get(key) {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch {
      return localStorage.getItem(key)
    }
  },

  set(key, value) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  },

  remove(key) {
    localStorage.removeItem(key)
  },

  getToken() {
    return localStorage.getItem('token')
  },

  setToken(token) {
    localStorage.setItem('token', token)
  },

  getUser() {
    return this.get('user')
  },

  setUser(user) {
    this.set('user', user)
  },

  getTheme() {
    return localStorage.getItem('theme') || 'light'
  },

  setTheme(theme) {
    localStorage.setItem('theme', theme)
  },
}
