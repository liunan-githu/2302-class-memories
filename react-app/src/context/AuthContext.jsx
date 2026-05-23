import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '../services/authService'
import { storage } from '../utils/storage'
import { PERMISSIONS, ROLES } from '../utils/permissionMap'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser())
  const [token, setToken] = useState(() => storage.getToken())
  const [isLoading, setIsLoading] = useState(true)
  const [permissions, setPermissions] = useState([])
  const pollRef = useRef(null)

  const isAuthenticated = !!token && !!user
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN

  const hasPermission = useCallback(
    (perm) => {
      if (isSuperAdmin) return true
      return permissions.includes(perm)
    },
    [permissions, isSuperAdmin],
  )

  const hasAnyPermission = useCallback(
    (perms) => perms.some((p) => hasPermission(p)),
    [hasPermission],
  )

  const login = useCallback(async (username, password) => {
    const data = await authService.login(username, password)
    setUser(data.user)
    setToken(data.token)
    return data
  }, [])

  const register = useCallback(async (username, password) => {
    const data = await authService.register(username, password)
    setUser(data.user)
    setToken(data.token)
    return data
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setToken(null)
    setPermissions([])
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  const checkUserStatus = useCallback(async () => {
    if (!token) return
    try {
      const status = await authService.getUserStatus()
      if (status.isBanned) {
        logout()
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: '您的账户已被封禁', type: 'error' } }))
      }
      return status
    } catch {}
  }, [token, logout])

  const fetchPermissions = useCallback(async () => {
    if (!token || !isAdmin) return
    try {
      const data = await authService.getUserPermissions()
      setPermissions(data.permissions || [])
    } catch {}
  }, [token, isAdmin])

  // Restore session on mount
  useEffect(() => {
    const u = storage.getUser()
    const t = storage.getToken()
    if (u && t) {
      setUser(u)
      setToken(t)
    }
    setIsLoading(false)
  }, [])

  // Poll user status every 10s
  useEffect(() => {
    if (!token) return
    checkUserStatus()
    if (isAdmin) fetchPermissions()
    pollRef.current = setInterval(() => {
      checkUserStatus()
      if (isAdmin) fetchPermissions()
    }, 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [token, isAdmin, checkUserStatus, fetchPermissions])

  // Listen for auth:status-update events from API client
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.isBanned) {
        logout()
      }
    }
    window.addEventListener('auth:status-update', handler)
    return () => window.removeEventListener('auth:status-update', handler)
  }, [logout])

  // Listen for forced logout (token expired)
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  return (
    <AuthContext.Provider
      value={{
        user, token, isAuthenticated, isAdmin, isSuperAdmin,
        isLoading, permissions,
        login, register, logout,
        hasPermission, hasAnyPermission,
        checkUserStatus, fetchPermissions,
        setUser, setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
