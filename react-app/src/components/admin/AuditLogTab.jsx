import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { adminService } from '../../services/adminService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useAuth } from '../../context/AuthContext'

const ACTION_ICONS = {
  USER_BAN: 'lucide:ban', USER_UNBAN: 'lucide:check-circle',
  USER_PROMOTE: 'lucide:arrow-up', USER_DEMOTE: 'lucide:arrow-down',
  PERMISSION_UPDATE: 'lucide:shield',
}

const ACTION_LABELS = {
  USER_BAN: '封禁用户', USER_UNBAN: '解封用户',
  USER_PROMOTE: '提升权限', USER_DEMOTE: '降级权限',
  PERMISSION_UPDATE: '更新权限',
}

export default function AuditLogTab() {
  const { isSuperAdmin } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAuditLogs({ page, limit: 20, action: actionFilter || undefined })
      setLogs(data?.logs || data || [])
    } catch {} finally { setLoading(false) }
  }, [page, actionFilter])

  useEffect(() => { loadLogs() }, [loadLogs])

  if (!isSuperAdmin) {
    return <div className="text-center py-16 text-dark-400"><Icon icon="lucide:shield-off" width={48} height={48} className="mx-auto mb-4" /><p>仅超级管理员可访问</p></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">操作日志</h1>

      <div className="flex items-center gap-3 mb-6">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1) }} className="px-4 py-2 rounded-xl border border-dark-600 bg-dark-800 text-white text-sm">
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : logs.length === 0 ? (
        <div className="text-center py-16 text-dark-400"><Icon icon="lucide:scroll-text" width={48} height={48} className="mx-auto mb-4 opacity-50" /><p>暂无日志</p></div>
      ) : (
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 text-dark-400">
                <th className="p-4 text-left">操作</th>
                <th className="p-4 text-left">目标</th>
                <th className="p-4 text-left">执行人</th>
                <th className="p-4 text-left">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-dark-700/50 text-dark-200">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Icon icon={ACTION_ICONS[l.action] || 'lucide:activity'} width={18} height={18} className="text-primary-400" />
                      <span>{ACTION_LABELS[l.action] || l.action}</span>
                    </div>
                  </td>
                  <td className="p-4">{l.targetUsername || l.targetId}</td>
                  <td className="p-4">{l.performedByUsername}</td>
                  <td className="p-4 text-dark-400">{new Date(l.timestamp).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
        <span className="text-dark-400 text-sm">第 {page} 页</span>
        <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={logs.length < 20}>下一页</Button>
      </div>
    </div>
  )
}
