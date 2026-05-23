import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { videoService } from '../../services/videoService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Tabs } from '../ui/Tabs'
import { Modal } from '../ui/Modal'
import { toast } from '../ui/Toast'
import { formatTimeAgo, formatFileSize, coverUrl } from '../../utils/formatTime'
import { escapeHtml } from '../../utils/escapeHtml'
import { cn } from '../../utils/cn'
import { useAuth } from '../../context/AuthContext'
import { PERMISSIONS } from '../../utils/permissionMap'

export default function VideoManageTab() {
  const { hasPermission } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Transcode state
  const [transcodeActive, setTranscodeActive] = useState([])
  const [transcodingIds, setTranscodingIds] = useState(new Set())
  const pollTimer = useRef(null)

  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      let data
      if (tab === 'pending') data = await videoService.getPending()
      else data = await videoService.getAll()
      setVideos(data || [])
    } catch {} finally { setLoading(false) }
  }, [tab])

  useEffect(() => { loadVideos() }, [loadVideos])

  // Transcode polling
  const startPolling = useCallback(() => {
    if (pollTimer.current) return
    const poll = async () => {
      try {
        const status = await videoService.getTranscodeStatus()
        const active = status?.active || []
        setTranscodeActive(active)
        setTranscodingIds(new Set(active.map((a) => a.videoId)))
        if (active.length === 0 && pollTimer.current) {
          clearInterval(pollTimer.current)
          pollTimer.current = null
          loadVideos() // refresh video list when all done
        }
      } catch {}
    }
    poll()
    pollTimer.current = setInterval(poll, 5000)
  }, [loadVideos])

  useEffect(() => {
    startPolling()
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [startPolling])

  const handleTranscode = async (videoId) => {
    try {
      setTranscodingIds((prev) => new Set([...prev, videoId]))
      toast.info('开始转码...')
      await videoService.transcode(videoId)
      setTranscodingIds((prev) => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
      toast.success('转码完成')
      loadVideos()
      startPolling()
    } catch (e) {
      setTranscodingIds((prev) => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
      toast.error(e.message || '转码失败')
    }
  }

  const filtered = videos.filter((v) => {
    if (tab === 'approved') return v.status === 'approved'
    if (tab === 'rejected') return v.status === 'rejected'
    if (tab === 'pending') return v.status === 'pending'
    return true
  }).filter((v) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q))
  })

  const handleApprove = async (id) => {
    try { await videoService.approve(id); loadVideos(); toast.success('已通过') } catch (e) { toast.error(e.message) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    try { await videoService.reject(rejectModal, rejectReason); setRejectModal(null); setRejectReason(''); loadVideos(); toast.success('已拒绝') } catch (e) { toast.error(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此视频？此操作不可撤销。')) return
    try { await videoService.delete(id); loadVideos(); toast.success('已删除') } catch (e) { toast.error(e.message) }
  }

  const statusVariant = (s) => s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending'
  const statusLabel = (s) => s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审核'

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">视频管理</h1>

      {/* Transcode Status Bar */}
      {transcodeActive.length > 0 && (
        <div className="mb-6 bg-dark-800 border border-primary-600/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="lucide:loader-2" width={20} height={20} className="text-primary-400 animate-spin" />
            <span className="text-white font-medium">正在转码 {transcodeActive.length} 个视频</span>
          </div>
          <div className="space-y-2">
            {transcodeActive.map((task) => (
              <div key={task.videoId} className="flex items-center gap-3">
                <span className="text-dark-300 text-sm flex-1 truncate">{task.title || `视频 #${task.videoId}`}</span>
                <div className="w-32 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${task.progress || 0}%` }} />
                </div>
                <span className="text-dark-400 text-xs min-w-[32px] text-right">{task.progress || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Tabs
          tabs={[
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
            { value: 'all', label: '全部' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="relative">
          <Icon icon="lucide:search" width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text" placeholder="搜索视频..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-dark-600 bg-dark-800 text-white text-sm focus:border-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-dark-400">
          <Icon icon="lucide:video" width={48} height={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无{tab === 'pending' ? '待审核' : ''}视频</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const isTranscoding = transcodingIds.has(v.id)
            const hasQualities = v.qualities && v.qualities.length > 1

            return (
              <div key={v.id} className="bg-dark-800 rounded-xl p-4 flex items-center gap-4">
                <img
                  src={coverUrl(v)}
                  alt=""
                  className="w-32 h-20 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
                <div className="w-32 h-20 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0" style={{ display: 'none' }}>
                  <Icon icon="lucide:video" width={24} height={24} className="text-dark-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium truncate">{escapeHtml(v.title)}</h3>
                    {isTranscoding && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 text-xs flex-shrink-0">
                        <Icon icon="lucide:loader-2" width={12} height={12} className="animate-spin" /> 转码中
                      </span>
                    )}
                    {!isTranscoding && hasQualities && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 text-xs flex-shrink-0">
                        <Icon icon="lucide:check-circle" width={12} height={12} /> 已转码
                      </span>
                    )}
                  </div>
                  <p className="text-dark-400 text-sm mt-1">
                    {formatTimeAgo(v.created_at)}
                    {v.qualities?.length > 0 && (
                      <span className="ml-2">{v.qualities.map((q) => q.label || q.quality).join(' · ')}</span>
                    )}
                  </p>
                  {v.description && <p className="text-dark-500 text-xs truncate mt-1">{escapeHtml(v.description)}</p>}
                </div>
                <Badge variant={statusVariant(v.status)}>{statusLabel(v.status)}</Badge>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.status === 'pending' && hasPermission(PERMISSIONS.VIDEO_AUDIT) && (
                    <>
                      <Button variant="success" size="sm" onClick={() => handleApprove(v.id)}>通过</Button>
                      <Button variant="danger" size="sm" onClick={() => setRejectModal(v.id)}>拒绝</Button>
                    </>
                  )}
                  {/* Transcode button */}
                  {hasPermission(PERMISSIONS.VIDEO_MANAGE) && !isTranscoding && (
                    <Button variant="secondary" size="sm" onClick={() => handleTranscode(v.id)} title="重新/开始转码">
                      <Icon icon="lucide:film" width={14} height={14} /> 转码
                    </Button>
                  )}
                  {hasPermission(PERMISSIONS.VIDEO_DELETE) && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)}>
                      <Icon icon="lucide:trash" width={16} height={16} className="text-dark-400 hover:text-danger-400" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="拒绝视频">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">请输入拒绝原因：</p>
          <textarea
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm min-h-[80px]"
            placeholder="拒绝原因..."
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRejectModal(null)}>取消</Button>
            <Button variant="danger" onClick={handleReject}>确认拒绝</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
