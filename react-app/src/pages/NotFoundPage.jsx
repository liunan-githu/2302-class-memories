import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
        <Icon icon="lucide:search-x" width={48} height={48} className="text-primary-500" />
      </div>
      <h1 className="text-4xl font-heading font-bold mb-2">404</h1>
      <p className="text-gray-500 dark:text-dark-400 mb-8">页面不存在</p>
      <Link to="/" className="px-6 py-3 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition">
        返回首页
      </Link>
    </div>
  )
}
