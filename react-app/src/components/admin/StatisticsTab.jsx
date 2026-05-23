import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { videoService } from '../../services/videoService'
import { photoService } from '../../services/photoService'
import { adminService } from '../../services/adminService'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export default function StatisticsTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [videos, photos, users] = await Promise.all([
        videoService.getAll().catch(() => []),
        photoService.getAll().catch(() => []),
        adminService.getAllUsers().catch(() => []),
      ])
      const vids = videos || []
      const phs = photos || []
      setStats({
        totalVideos: vids.length,
        pendingVideos: vids.filter((v) => v.status === 'pending').length,
        approvedVideos: vids.filter((v) => v.status === 'approved').length,
        totalPhotos: phs.length,
        pendingPhotos: phs.filter((p) => p.status === 'pending').length,
        approvedPhotos: phs.filter((p) => p.status === 'approved').length,
        totalUsers: (users || []).length,
      })
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingSpinner />

  const cards = stats ? [
    { label: '视频总数', value: stats.totalVideos, icon: 'lucide:video', color: 'text-primary-400' },
    { label: '待审视频', value: stats.pendingVideos, icon: 'lucide:clock', color: 'text-warning-400' },
    { label: '照片总数', value: stats.totalPhotos, icon: 'lucide:image', color: 'text-teal-400' },
    { label: '待审照片', value: stats.pendingPhotos, icon: 'lucide:clock', color: 'text-warning-400' },
    { label: '已通过视频', value: stats.approvedVideos, icon: 'lucide:check-circle', color: 'text-success-400' },
    { label: '用户总数', value: stats.totalUsers, icon: 'lucide:users', color: 'text-primary-400' },
  ] : []

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">数据统计</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-dark-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center`}>
                <Icon icon={c.icon} width={24} height={24} className={c.color} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{c.value}</p>
                <p className="text-dark-400 text-sm">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
