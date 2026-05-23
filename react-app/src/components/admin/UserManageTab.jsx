import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { adminService } from '../../services/adminService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { toast } from '../ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { PERMISSIONS } from '../../utils/permissionMap'

export default function UserManageTab() {
  const { hasPermission, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [actionModal, setActionModal] = useState(null) // { userId, type: 'ban'|'upload' }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try { setUsers(await adminService.getAllUsers() || []) } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleAction = async () => {
    if (!actionModal) return
    const { userId, type } = actionModal
    try {
      if (type === 'ban') await adminService.banUser(userId, reason)
      else if (type === 'unban') await adminService.unbanUser(userId)
      else if (type === 'disableUpload') await adminService.disableUpload(userId, reason)
      else if (type === 'enableUpload') await adminService.enableUpload(userId)
      else if (type === 'promote') await adminService.promoteUser(userId)
      else if (type === 'demote') await adminService.demoteUser(userId)
      setActionModal(null)
      setReason('')
      loadUsers()
      toast.success('操作成功')
    } catch (e) { toast.error(e.message) }
  }

  const isSelf = (userId) => userId === currentUser?.id

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">用户管理</h1>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-dark-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {u.username?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{u.username}</span>
                  {u.role === 'superadmin' ? <Badge variant="danger">超级管理员</Badge> : u.role === 'admin' ? <Badge variant="primary">管理员</Badge> : u.role === 'moderator' ? <Badge variant="warning">协管</Badge> : null}
                  {u.isBanned && <Badge variant="danger">已封禁</Badge>}
                  {u.uploadDisabled && <Badge variant="warning">禁止上传</Badge>}
                </div>
                {u.banReason && <p className="text-dark-500 text-xs mt-1">封禁原因：{u.banReason}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isSelf(u.id) && hasPermission(PERMISSIONS.USER_BAN) && (
                  u.isBanned
                    ? <Button variant="success" size="sm" onClick={() => setActionModal({ userId: u.id, type: 'unban' })}>解封</Button>
                    : <Button variant="danger" size="sm" onClick={() => setActionModal({ userId: u.id, type: 'ban' })}>封禁</Button>
                )}
                {!isSelf(u.id) && hasPermission(PERMISSIONS.USER_DISABLE_UPLOAD) && (
                  u.uploadDisabled
                    ? <Button variant="success" size="sm" onClick={() => setActionModal({ userId: u.id, type: 'enableUpload' })}>允许上传</Button>
                    : <Button variant="warning" size="sm" onClick={() => setActionModal({ userId: u.id, type: 'disableUpload' })}>禁止上传</Button>
                )}
                {!isSelf(u.id) && u.role !== 'superadmin' && hasPermission(PERMISSIONS.USER_PROMOTE) && u.role !== 'admin' && (
                  <Button variant="primary" size="sm" onClick={() => setActionModal({ userId: u.id, type: 'promote' })}>升为管理</Button>
                )}
                {!isSelf(u.id) && u.role === 'admin' && hasPermission(PERMISSIONS.USER_DEMOTE) && (
                  <Button variant="warning" size="sm" onClick={() => setActionModal({ userId: u.id, type: 'demote' })}>降级</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!actionModal} onClose={() => setActionModal(null)} title="确认操作">
        <div className="space-y-4">
          {(actionModal?.type === 'ban' || actionModal?.type === 'disableUpload') && (
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm min-h-[80px]"
              placeholder="请输入原因..."
            />
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setActionModal(null)}>取消</Button>
            <Button variant="danger" onClick={handleAction}>确认</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
