export function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.max(0, now - date)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return years + '年前'
  if (months > 0) return months + '个月前'
  if (days > 0) return days + '天前'
  if (hours > 0) return hours + '小时前'
  if (minutes > 0) return minutes + '分钟前'
  return '刚刚'
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function formatViews(views) {
  if (!views) return '0'
  if (views >= 10000) return (views / 10000).toFixed(1) + '万'
  if (views >= 1000) return (views / 1000).toFixed(1) + 'k'
  return String(views)
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return size.toFixed(1) + ' ' + units[i]
}

export function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function coverUrl(video) {
  if (!video) return ''
  if (video.coverFilename) return `/uploads/${video.coverFilename}`
  if (video.id) return `/api/video-cover/${video.id}`
  return ''
}
