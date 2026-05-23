import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { videoService } from '../../services/videoService'
import { commentService } from '../../services/commentService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { toast } from '../ui/Toast'
import { formatTimeAgo } from '../../utils/formatTime'
import { escapeHtml } from '../../utils/escapeHtml'

export default function CommentManageTab() {
  const [videos, setVideos] = useState([])
  const [comments, setComments] = useState({})
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const vids = await videoService.getAll()
      const approved = (vids || []).filter((v) => v.status === 'approved')
      setVideos(approved)
      const results = await Promise.all(
        approved.map((v) => commentService.getByVideo(v.id).catch(() => []))
      )
      const map = {}
      approved.forEach((v, i) => { map[v.id] = results[i] || [] })
      setComments(map)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (videoId, commentId) => {
    try {
      await commentService.delete(commentId)
      setComments((prev) => ({ ...prev, [videoId]: prev[videoId].filter((c) => c.id !== commentId) }))
      toast.success('已删除')
    } catch (e) { toast.error(e.message) }
  }

  const allFlattened = videos.flatMap((v) => (comments[v.id] || []).map((c) => ({ ...c, videoId: v.id, videoTitle: v.title })))

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">评论管理</h1>
      {allFlattened.length === 0 ? (
        <div className="text-center py-16 text-dark-400"><Icon icon="lucide:message-square" width={48} height={48} className="mx-auto mb-4 opacity-50" /><p>暂无评论</p></div>
      ) : (
        <div className="space-y-3">
          {allFlattened.map((c) => (
            <div key={`${c.videoId}-${c.id}`} className="bg-dark-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{escapeHtml(c.username)}</p>
                  <p className="text-dark-400 text-xs mt-0.5">在 <span className="text-primary-400">{escapeHtml(c.videoTitle)}</span> 下评论</p>
                  <p className="text-dark-300 text-sm mt-2">{escapeHtml(c.content)}</p>
                  <p className="text-dark-500 text-xs mt-1">{formatTimeAgo(c.createdAt)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.videoId, c.id)}>
                  <Icon icon="lucide:trash" width={16} height={16} className="text-dark-400 hover:text-danger-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
