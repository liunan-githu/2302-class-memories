import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PERMISSIONS } from '../../utils/permissionMap'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()

  useEffect(() => {
    if (hasPermission(PERMISSIONS.VIDEO_MANAGE)) navigate('/admin/videos', { replace: true })
    else if (hasPermission(PERMISSIONS.PHOTO_MANAGE)) navigate('/admin/photos', { replace: true })
    else if (hasPermission(PERMISSIONS.USER_MANAGEMENT)) navigate('/admin/users', { replace: true })
    else navigate('/', { replace: true })
  }, [navigate, hasPermission])

  return null
}
