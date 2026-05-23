import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../../context/AuthContext'

export function MobileMenu({ isOpen, onClose }) {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleNav = (path) => {
    navigate(path)
    onClose()
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-[68px] left-0 right-0 glass border-b border-primary-100/30 dark:border-dark-700/30 p-4 animate-slide-up">
        <div className="flex flex-col gap-2">
          <button onClick={() => handleNav('/')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors text-left">
            <Icon icon="lucide:home" width={22} height={22} className="text-primary-600" />
            <span className="font-medium">首页</span>
          </button>
          <button onClick={() => handleNav('/classmates')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors text-left">
            <Icon icon="lucide:users" width={22} height={22} className="text-primary-600" />
            <span className="font-medium">同学录</span>
          </button>
          <button onClick={() => handleNav('/about')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors text-left">
            <Icon icon="lucide:info" width={22} height={22} className="text-primary-600" />
            <span className="font-medium">关于</span>
          </button>

          <hr className="border-primary-100/50 dark:border-dark-700/50 my-2" />

          {isAuthenticated ? (
            <>
              <button onClick={() => handleNav('/upload')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors text-left">
                <Icon icon="lucide:upload" width={22} height={22} className="text-primary-600" />
                <span className="font-medium">上传</span>
              </button>
              {isAdmin && (
                <button onClick={() => handleNav('/admin')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors text-left">
                  <Icon icon="lucide:shield" width={22} height={22} className="text-primary-600" />
                  <span className="font-medium">管理后台</span>
                </button>
              )}
              <div className="p-3 text-sm text-gray-500 dark:text-dark-400">
                {user?.username}
              </div>
              <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors text-left text-danger-500">
                <Icon icon="lucide:log-out" width={22} height={22} />
                <span className="font-medium">退出</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleNav('/login')} className="flex items-center gap-3 p-3 rounded-xl bg-primary-600 text-white text-center justify-center font-medium">
                登录
              </button>
              <button onClick={() => handleNav('/register')} className="flex items-center gap-3 p-3 rounded-xl border border-primary-600 text-primary-600 text-center justify-center font-medium">
                注册
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
