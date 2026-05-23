import { useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/cn'

const tabs = [
  { path: '/', icon: 'lucide:home', label: '首页' },
  { path: '/upload', icon: 'lucide:upload', label: '上传', auth: true },
  { path: '/classmates', icon: 'lucide:users', label: '同学录' },
  { path: '/about', icon: 'lucide:info', label: '关于' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-primary-100/30 dark:border-dark-700/30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          if (tab.auth && !isAuthenticated) return null
          const active = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[64px]',
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-dark-400',
              )}
            >
              <Icon icon={tab.icon} width={22} height={22} />
              <span className="text-xs font-medium">{tab.label}</span>
              {active && <div className="absolute -bottom-1 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
