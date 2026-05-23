import { useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/cn'
import { PERMISSIONS } from '../../utils/permissionMap'

const menuItems = [
  { path: '/admin/videos', icon: 'lucide:video', label: '视频管理', perm: PERMISSIONS.VIDEO_MANAGE },
  { path: '/admin/photos', icon: 'lucide:image', label: '照片管理', perm: PERMISSIONS.PHOTO_MANAGE },
  { path: '/admin/users', icon: 'lucide:users', label: '用户管理', perm: PERMISSIONS.USER_MANAGEMENT },
  { path: '/admin/classmates', icon: 'lucide:graduation-cap', label: '同学录管理', perm: PERMISSIONS.CLASSMATES_MANAGE },
  { path: '/admin/about', icon: 'lucide:file-text', label: '关于页编辑', perm: PERMISSIONS.ABOUT_MANAGE },
  { path: '/admin/comments', icon: 'lucide:message-square', label: '评论管理', perm: PERMISSIONS.COMMENT_MANAGE },
  { path: '/admin/statistics', icon: 'lucide:bar-chart-3', label: '数据统计', perm: PERMISSIONS.STATISTICS_VIEW },
  { path: '/admin/permissions', icon: 'lucide:shield', label: '权限管理', perm: PERMISSIONS.PERMISSION_MANAGE },
  { path: '/admin/audit', icon: 'lucide:scroll-text', label: '操作日志', perm: PERMISSIONS.AUDIT_LOG_VIEW },
]

export function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isSuperAdmin, hasPermission, logout } = useAuth()

  const visibleItems = menuItems.filter((item) => hasPermission(item.perm))

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-dark-800 border-r border-dark-700 z-30 hidden lg:flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon="lucide:graduation-cap" width={28} height={28} className="text-primary-500" />
          <span className="font-heading font-bold text-lg text-white">管理后台</span>
        </div>
        <a href="/" className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-primary-400 transition-colors">
          <Icon icon="lucide:arrow-left" width={16} height={16} />
          返回前台
        </a>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
            {user?.username?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium text-sm">{user?.username}</div>
            <div className="text-dark-400 text-xs">{isSuperAdmin ? '超级管理员' : '管理员'}</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all mb-1',
                active
                  ? 'bg-primary-600/20 text-primary-400 border-l-4 border-primary-500'
                  : 'text-dark-300 hover:bg-dark-700/50 hover:text-white border-l-4 border-transparent',
              )}
            >
              <Icon icon={item.icon} width={20} height={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700">
        <button
          onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-dark-400 hover:text-danger-400 hover:bg-dark-700 transition-colors text-sm"
        >
          <Icon icon="lucide:log-out" width={18} height={18} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
