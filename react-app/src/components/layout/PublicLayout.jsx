import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { Toast } from '../ui/Toast'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-primary-50 dark:bg-dark-900 text-gray-900 dark:text-dark-50 transition-colors duration-300">
      <Navbar />
      <main className="pt-[68px] md:pt-[68px] min-h-[calc(100vh-68px)]">
        <Outlet />
      </main>
      <BottomNav />
      <Toast />
    </div>
  )
}
