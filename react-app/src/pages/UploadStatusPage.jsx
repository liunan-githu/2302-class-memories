import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { videoService } from '../services/videoService'
import { photoService } from '../services/photoService'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { formatTimeAgo } from '../utils/formatTime'
import { escapeHtml } from '../utils/escapeHtml'
import AnimatedContent from '../components/ui/AnimatedContent'

export default function UploadStatusPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [transcodeActive, setTranscodeActive] = useState([])
  const pollTimer = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [v, p] = await Promise.all([
        videoService.getUserVideos(),
        photoService.getUserPhotos(),
      ])
      setVideos(v || [])
      setPhotos(p || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Transcode polling
  useEffect(() => {
    const poll = async () => {
      try {
        const status = await videoService.getUserTranscodeStatus()
        const active = status?.active || []
        setTranscodeActive(active)
        if (active.length === 0 && pollTimer.current) {
          clearInterval(pollTimer.current)
          pollTimer.current = null
          loadData()
        }
      } catch {}
    }
    poll()
    pollTimer.current = setInterval(poll, 5000)
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [loadData])

  const statusVariant = (s) => {
    if (s === 'approved') return 'approved'
    if (s === 'rejected') return 'rejected'
    return 'pending'
  }

  const transcodingIds = new Set(transcodeActive.map((a) => a.videoId))

  if (loading) return <LoadingSpinner />

  if (videos.length === 0 && photos.length === 0 && transcodeActive.length === 0) {
    return (
      <EmptyState
        icon="lucide:upload"
        title="还没有上传内容"
        description="上传视频或照片来分享你的回忆"
        action={
          <button onClick={() => navigate('/upload')} className="px-5 py-2.5 rounded-full bg-primary-600 text-white font-semibold text-sm">
            去上传
          </button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <AnimatedContent distance={30} duration={0.5}>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition">
          <Icon icon="lucide:arrow-left" width={24} height={24} />
        </button>
        <h1 className="text-2xl font-heading font-bold">我的上传</h1>
      </div>

      </AnimatedContent>

      {/* Transcode Status */}
      {transcodeActive.length > 0 && (
        <section className="mb-8 bg-primary-50 dark:bg-dark-800 border border-primary-300 dark:border-primary-600/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="lucide:loader-2" width={20} height={20} className="text-primary-500 animate-spin" />
            <span className="font-medium">视频转码中，完成后即可观看高清版本</span>
          </div>
          <div className="space-y-2">
            {transcodeActive.map((task) => (
              <div key={task.videoId} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{escapeHtml(task.title || `视频 #${task.videoId}`)}</span>
                <div className="w-32 h-1.5 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${task.progress || 0}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-dark-400 min-w-[32px] text-right">{task.progress || 0}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <Icon icon="lucide:video" width={20} height={20} className="text-primary-600" /> 视频
          </h2>
          <div className="space-y-3">
            {videos.map((v) => {
              const isTranscoding = transcodingIds.has(v.id)
              const hasQualities = v.qualities && v.qualities.length > 1
              return (
                <div key={v.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <Icon icon="lucide:video" width={32} height={32} className="text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{escapeHtml(v.title)}</p>
                      {isTranscoding && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs flex-shrink-0">
                          <Icon icon="lucide:loader-2" width={12} height={12} className="animate-spin" /> 转码中
                        </span>
                      )}
                      {!isTranscoding && hasQualities && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-xs flex-shrink-0">
                          <Icon icon="lucide:check-circle" width={12} height={12} /> {v.qualities.map((q) => q.label || q.quality).join(' · ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{formatTimeAgo(v.created_at)}</p>
                  </div>
                  <Badge variant={statusVariant(v.status)}>
                    {v.status === 'approved' ? '已通过' : v.status === 'rejected' ? '已拒绝' : '审核中'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section>
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <Icon icon="lucide:image" width={20} height={20} className="text-primary-600" /> 照片
          </h2>
          <div className="space-y-3">
            {photos.map((p) => (
              <div key={p.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <Icon icon="lucide:images" width={32} height={32} className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{escapeHtml(p.title)}</p>
                  <p className="text-xs text-gray-400">{p.photos?.length || 0} 张 · {formatTimeAgo(p.created_at)}</p>
                </div>
                <Badge variant={statusVariant(p.status)}>
                  {p.status === 'approved' ? '已通过' : p.status === 'rejected' ? '已拒绝' : '审核中'}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
