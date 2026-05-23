import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { adminService } from '../../services/adminService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { toast } from '../ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, ROLES } from '../../utils/permissionMap'

const PERM_GROUPS = {
  '用户管理': [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGEMENT, PERMISSIONS.USER_PROMOTE, PERMISSIONS.USER_DEMOTE, PERMISSIONS.USER_BAN, PERMISSIONS.USER_UNBAN, PERMISSIONS.USER_DISABLE_UPLOAD, PERMISSIONS.USER_ENABLE_UPLOAD],
  '内容管理': [PERMISSIONS.VIDEO_AUDIT, PERMISSIONS.VIDEO_MANAGE, PERMISSIONS.VIDEO_DELETE, PERMISSIONS.PHOTO_MANAGE, PERMISSIONS.PHOTO_DELETE, PERMISSIONS.COMMENT_MANAGE, PERMISSIONS.COMMENT_DELETE],
  '系统管理': [PERMISSIONS.CLASSMATES_MANAGE, PERMISSIONS.ABOUT_MANAGE, PERMISSIONS.STATISTICS_VIEW],
  '安全管理': [PERMISSIONS.AUDIT_LOG_VIEW, PERMISSIONS.PERMISSION_MANAGE, PERMISSIONS.ROLE_MANAGE, PERMISSIONS.SYSTEM_SETTINGS],
}

export default function PermissionManageTab() {
  const { isSuperAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editPerms, setEditPerms] = useState([])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try { setUsers(await adminService.getAllUsers() || []) } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  if (!isSuperAdmin) {
    return <div className="text-center py-16 text-dark-400"><Icon icon="lucide:shield-off" width={48} height={48} className="mx-auto mb-4" /><p>仅超级管理员可访问</p></div>
  }

  const openEditor = (user) => {
    setSelectedUser(user)
    setEditPerms(user.permissions || ROLE_DEFAULT_PERMISSIONS[user.role] || [])
  }

  const togglePerm = (perm) => {
    setEditPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm])
  }

  const handleSave = async () => {
    try {
      await adminService.updatePermissions(selectedUser.id, editPerms)
      toast.success('权限已更新')
      setSelectedUser(null)
      loadUsers()
    } catch (e) { toast.error(e.message) }
  }

  const applyTemplate = (perms) => setEditPerms([...perms])

  const filteredUsers = users.filter((u) => u.role !== ROLES.SUPERADMIN)

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">权限管理</h1>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-dark-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">{u.username?.charAt(0)?.toUpperCase()}</div>
              <div className="flex-1"><span className="text-white font-medium">{u.username}</span><span className="text-dark-400 text-sm ml-2">{u.role}</span></div>
              <Button variant="secondary" size="sm" onClick={() => openEditor(u)}>管理权限</Button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title={`权限管理 - ${selectedUser?.username}`} size="lg">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => applyTemplate(ROLE_DEFAULT_PERMISSIONS.admin)}>应用管理员模板</Button>
            <Button variant="secondary" size="sm" onClick={() => applyTemplate(ROLE_DEFAULT_PERMISSIONS.moderator)}>应用协管模板</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditPerms([])}>清空全部</Button>
          </div>
          {Object.entries(PERM_GROUPS).map(([group, perms]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-200 mb-2">{group}</h4>
              <div className="grid grid-cols-2 gap-2">
                {perms.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-dark-300">
                    <input type="checkbox" checked={editPerms.includes(p)} onChange={() => togglePerm(p)} className="w-4 h-4 rounded accent-primary-600" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
