import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <AdminSidebar />
      <div className="flex-1 ml-0 lg:ml-[280px] p-4 lg:p-8 pt-4">
        <Outlet />
      </div>
    </div>
  )
}
