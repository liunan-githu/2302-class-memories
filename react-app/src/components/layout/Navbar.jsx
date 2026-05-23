import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useMobile } from '../../hooks/useMobile'
import { MobileMenu } from './MobileMenu'

export function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const isMobile = useMobile()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="glass fixed top-0 left-0 right-0 z-50 h-[68px] border-b border-primary-100/30 dark:border-dark-700/30">
        <div className="mx-auto max-w-[1440px] px-4 h-full flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-inherit font-heading font-bold text-lg"
            >
              <Icon icon="lucide:graduation-cap" width={28} height={28} className="text-primary-600 dark:text-primary-500" />
              <span className="hidden sm:inline">2302班回忆录</span>
            </button>
          </div>

          {/* Center: Nav links (desktop) */}
          {!isMobile && (
            <div className="flex items-center gap-1">
              <Link to="/" className="nav-link px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-dark-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">首页</Link>
              <Link to="/classmates" className="nav-link px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-dark-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">同学录</Link>
              <Link to="/about" className="nav-link px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-dark-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">关于</Link>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {!isMobile && (
                  <>
                    <Link to="/upload" className="px-4 py-2 rounded-full text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                      上传
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="px-4 py-2 rounded-full text-sm font-medium border border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                        管理
                      </Link>
                    )}
                    <button onClick={handleLogout} className="px-3 py-2 rounded-full text-sm text-gray-500 hover:text-danger-500 transition-colors">
                      退出
                    </button>
                  </>
                )}
                <span className="text-sm text-gray-500 dark:text-dark-400 hidden md:inline">{user?.username}</span>
              </>
            ) : (
              !isMobile && (
                <>
                  <Link to="/login" className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-dark-200 hover:text-primary-600 transition-colors">登录</Link>
                  <Link to="/register" className="px-4 py-2 rounded-full text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">注册</Link>
                </>
              )
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              aria-label="切换主题"
            >
              <Icon icon={isDark ? 'lucide:sun' : 'lucide:moon'} width={22} height={22} className="text-gray-600 dark:text-dark-300" />
            </button>

            {isMobile && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                aria-label="菜单"
              >
                <Icon icon={menuOpen ? 'lucide:x' : 'lucide:menu'} width={26} height={26} className="text-gray-700 dark:text-dark-200" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {isMobile && <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />}
    </>
  )
}
