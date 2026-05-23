import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { videoService } from '../services/videoService'
import { commentService } from '../services/commentService'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { toast } from '../components/ui/Toast'
import { formatTimeAgo, formatViews, formatDuration, coverUrl } from '../utils/formatTime'
import { escapeHtml } from '../utils/escapeHtml'
import AnimatedContent from '../components/ui/AnimatedContent'
import VideoPlayer from '../player/VideoPlayer'

export default function VideoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [video, setVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const loadVideo = useCallback(async () => {
    setLoading(true)
    try {
      const [v, c] = await Promise.all([
        videoService.getById(id),
        commentService.getByVideo(id),
      ])
      setVideo(v)
      setComments(c || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadVideo() }, [loadVideo])

  const handleLike = async () => {
    if (!isAuthenticated) { toast.warning('请先登录'); return }
    try {
      const result = await videoService.like(id)
      setVideo((prev) => ({ ...prev, likes: result.likes }))
      toast.success('点赞成功')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      const newComment = await commentService.create(id, commentText.trim())
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
      toast.success('评论成功')
    } catch (err) {
      toast.error(err.message || '评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.delete(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success('已删除')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return (
    <div className="text-center py-20">
      <Icon icon="lucide:alert-circle" width={48} height={48} className="text-danger-500 mx-auto mb-4" />
      <p className="text-gray-500">{error}</p>
    </div>
  )
  if (!video) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AnimatedContent distance={30} duration={0.5}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-4 transition-colors">
        <Icon icon="lucide:arrow-left" width={18} height={18} /> 返回
      </button>

      <VideoPlayer
        src={`/uploads/${video.filename}`}
        poster={coverUrl(video)}
        qualities={video.qualities}
        videoId={video.id}
      />

      {/* Video Info */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold mb-3">{escapeHtml(video.title)}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-dark-400 mb-4">
          <span className="flex items-center gap-1"><Icon icon="lucide:eye" width={16} height={16} /> {formatViews(video.views)} 浏览</span>
          <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={16} height={16} /> {formatTimeAgo(video.created_at)}</span>
          {video.duration > 0 && <span className="flex items-center gap-1"><Icon icon="lucide:timer" width={16} height={16} /> {formatDuration(video.duration)}</span>}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Button variant="secondary" size="sm" onClick={handleLike}>
            <Icon icon="lucide:heart" width={16} height={16} /> {video.likes || 0} 点赞
          </Button>
          {video.category && <Badge variant="primary">{video.category}</Badge>}
        </div>

        {video.description && (
          <p className="text-gray-600 dark:text-dark-300 leading-relaxed">{escapeHtml(video.description)}</p>
        )}

        {video.tags && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {video.tags.split(',').filter(Boolean).map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs">{t.trim()}</span>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
          <Icon icon="lucide:message-square" width={20} height={20} className="text-primary-600" /> 评论 ({comments.length})
        </h3>

        {isAuthenticated ? (
          <form onSubmit={handleComment} className="flex gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.username?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm resize-none min-h-[60px] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{commentText.length}/500</span>
                <Button type="submit" size="sm" loading={submitting} disabled={!commentText.trim()}>发表评论</Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 mb-6 text-sm text-gray-400">
            请 <button onClick={() => navigate('/login')} className="text-primary-600 font-medium">登录</button> 后发表评论
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">暂无评论，来说点什么吧</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dark-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {c.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{escapeHtml(c.username)}</span>
                    <span className="text-xs text-gray-400">{formatTimeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-dark-300">{escapeHtml(c.content)}</p>
                  {isAuthenticated && (user?.id === c.userId || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-danger-500 mt-1">删除</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </AnimatedContent>
    </div>
  )
}
