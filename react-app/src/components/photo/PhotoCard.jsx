import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { formatTimeAgo } from '../../utils/formatTime'
import { escapeHtml } from '../../utils/escapeHtml'
import { TiltCard } from '../ui/TiltCard'

export function PhotoCard({ photo }) {
  const navigate = useNavigate()
  if (!photo) return null

  const coverPhoto = photo.photos?.[0]
  const count = photo.photos?.length || 0

  return (
    <TiltCard tiltAmount={6} glowColor="rgba(251, 113, 133, 0.08)">
      <div
        className="group glass rounded-2xl overflow-hidden cursor-pointer hover-lift transition-all duration-300"
        onClick={() => navigate(`/video/${photo.id}`)}
      >
        <div className="relative aspect-[4/3] bg-dark-800 overflow-hidden">
          {coverPhoto ? (
            <img
              src={`/uploads/${coverPhoto.filename}`}
              alt={photo.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
              <Icon icon="lucide:image" width={48} height={48} className="text-dark-600" />
            </div>
          )}
          {count > 1 && (
            <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs flex items-center gap-1">
              <Icon icon="lucide:images" width={14} height={14} /> {count}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {escapeHtml(photo.title)}
          </h3>
          <p className="text-xs text-gray-400 dark:text-dark-500">{formatTimeAgo(photo.created_at)}</p>
        </div>
      </div>
    </TiltCard>
  )
}
