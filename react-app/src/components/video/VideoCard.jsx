import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { formatTimeAgo, formatDuration, formatViews, coverUrl } from '../../utils/formatTime'
import { escapeHtml } from '../../utils/escapeHtml'
import { TiltCard } from '../ui/TiltCard'

export function VideoCard({ video }) {
  const navigate = useNavigate()
  if (!video) return null

  return (
    <TiltCard tiltAmount={6} glowColor="rgba(245, 158, 11, 0.08)">
      <div
        className="group glass rounded-2xl overflow-hidden cursor-pointer hover-lift transition-all duration-300"
        onClick={() => navigate(`/video/${video.id}`)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-dark-800 overflow-hidden">
          <img
              src={coverUrl(video)}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
            <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900" style={{ display: 'none' }}>
              <Icon icon="lucide:video" width={48} height={48} className="text-dark-600" />
            </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
              <Icon icon="lucide:play" width={28} height={28} className="text-primary-600 ml-1" />
            </div>
          </div>
          {video.duration > 0 && (
            <span className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-mono">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-heading font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {escapeHtml(video.title)}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-dark-500">
            <span className="flex items-center gap-1">
              <Icon icon="lucide:eye" width={14} height={14} />
              {formatViews(video.views)}
            </span>
            <span className="flex items-center gap-1">
              <Icon icon="lucide:heart" width={14} height={14} />
              {video.likes || 0}
            </span>
            <span className="ml-auto">{formatTimeAgo(video.created_at)}</span>
          </div>
          {video.tags && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {video.tags.split(',').filter(Boolean).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </TiltCard>
  )
}
