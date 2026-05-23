const API_BASE = ''

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'ApiError'
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {}

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (options.headers) {
    Object.assign(headers, options.headers)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })

  // 后端自动续签 Token
  const newToken = response.headers.get('X-Refresh-Token')
  if (newToken) {
    localStorage.setItem('token', newToken)
  }

  if (response.status === 403) {
    try {
      const data = await response.clone().json()
      if (data.isBanned || data.uploadDisabled) {
        window.dispatchEvent(new CustomEvent('auth:status-update', { detail: data }))
      }
    } catch {}
  }

  if (response.status === 401) {
    try {
      const data = await response.clone().json()
      if (data.code === 'AUTH_TOKEN_EXPIRED') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return null
      }
    } catch {}
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(data.error || `Request failed (${response.status})`, response.status, data)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (url, opts) => request(url, { ...opts, method: 'GET' }),
  post: (url, body, opts) => request(url, { ...opts, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body, opts) => request(url, { ...opts, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (url, opts) => request(url, { ...opts, method: 'DELETE' }),

  upload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const token = localStorage.getItem('token')
      const startTime = Date.now()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = (e.loaded / e.total) * 100
          const elapsed = Math.max(0.1, (Date.now() - startTime) / 1000)
          const speed = (e.loaded / (1024 * 1024)) / elapsed
          onProgress(pct, speed)
        }
      })

      xhr.addEventListener('load', () => {
        // 后端自动续签 Token
        const newToken = xhr.getResponseHeader('X-Refresh-Token')
        if (newToken) {
          localStorage.setItem('token', newToken)
        }

        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status === 401 && data.code === 'AUTH_TOKEN_EXPIRED') {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.dispatchEvent(new CustomEvent('auth:logout'))
            reject(new ApiError(data.error || '登录已过期', xhr.status, data))
            return
          }
          if (xhr.status >= 200 && xhr.status < 300) resolve(data)
          else reject(new ApiError(data.error || 'Upload failed', xhr.status, data))
        } catch {
          reject(new Error('Invalid response'))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Network error')))
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

      xhr.open('POST', `${API_BASE}${url}`)
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  },
}

export { ApiError }
