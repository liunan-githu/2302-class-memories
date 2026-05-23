import { useRef, useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useVideoPlayer } from './useVideoPlayer'
import { cn } from '../utils/cn'

export default function VideoPlayer({ src, poster, qualities: rawQualities, videoId, onNext }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [videoEl, setVideoEl] = useState(null)

  useEffect(() => { if (videoRef.current) setVideoEl(videoRef.current) }, [])

  const player = useVideoPlayer(videoEl, containerRef)

  // Normalize qualities array with URLs and labels
  useEffect(() => {
    if (rawQualities?.length > 0) {
      const qs = rawQualities.map((q) => ({
        quality: q.quality || q.height || q.label,
        label: q.label || `${q.quality || q.height}P`,
        url: `/uploads/${q.filename}`,
        _default: q._default || false,
      }))
      player.setQualities(qs)
    }
  }, [rawQualities, player.setQualities])

  return (
    <div
      ref={containerRef}
      className={cn(
        'vp-player relative w-full bg-black rounded-2xl overflow-hidden select-none group',
        player.fullscreen && 'fixed inset-0 z-[100] rounded-none',
      )}
      onMouseMove={player.showControls}
    >
      {/* Video */}
      <div
        className="vp-video-wrapper relative aspect-video cursor-pointer select-none"
        onClick={player.togglePlay}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          if (e.button === 2) { // right click
            const timer = setTimeout(() => {
              player.startLongPress()
            }, 400)
            const onUp = () => {
              clearTimeout(timer)
              player.stopLongPress()
              document.removeEventListener('mouseup', onUp)
            }
            document.addEventListener('mouseup', onUp)
          }
        }}
        onTouchStart={() => {
          const timer = setTimeout(() => {
            player.startLongPress()
          }, 600)
          const onEnd = () => {
            clearTimeout(timer)
            player.stopLongPress()
            document.removeEventListener('touchend', onEnd)
          }
          document.addEventListener('touchend', onEnd)
        }}
      >
        <video
          ref={videoRef}
          className="vp-video w-full h-full block"
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
        />

        {/* 3x Fast-forward indicator */}
        {player.longPressing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full border-4 border-primary-400 border-t-transparent animate-spin" />
              <span className="text-primary-400 font-bold text-lg">3x 快放中</span>
            </div>
          </div>
        )}

        {/* Buffering Spinner */}
        {player.buffering && !player.longPressing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}

        {/* Center Play/Pause Button */}
        <div
          className={cn(
            'vp-overlay absolute inset-0 flex items-center justify-center bg-black/0 transition-opacity duration-200',
            player.paused ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <button
            className="vp-play-btn-large w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full bg-white/90 hover:bg-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
            onClick={player.togglePlay}
          >
            {player.playing ? (
              <Icon icon="lucide:pause" width={28} height={28} className="sm:w-9 sm:h-9 text-primary-600" />
            ) : (
              <Icon icon="lucide:play" width={28} height={28} className="sm:w-9 sm:h-9 text-primary-600 ml-1 sm:ml-1.5" />
            )}
          </button>
        </div>

        {/* Feedback Overlay */}
        {player.feedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 rounded-2xl px-6 py-4 flex flex-col items-center gap-2 animate-scale-in">
              <span className="text-3xl">{player.feedback.icon}</span>
              <span className="text-white text-sm">{player.feedback.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div
        className={cn(
          'vp-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-6 sm:pt-10 pb-1.5 sm:pb-3 px-2 sm:px-4 transition-opacity duration-300',
          player.controlsVisible || player.paused ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Progress Bar */}
        <div
          className="vp-progress-container relative w-full h-4 sm:h-5 mb-1 sm:mb-2 cursor-pointer group/progress"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = ((e.clientX - rect.left) / rect.width) * 100
            player.setTimeTooltipPos(Math.max(0, Math.min(100, pct)))
            player.setTimeTooltipText(player.formatTime((pct / 100) * player.duration))
            player.setShowTimeTooltip(true)
          }}
          onMouseLeave={() => player.setShowTimeTooltip(false)}
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = ((e.clientX - rect.left) / rect.width) * 100
            player.seek(pct)
            player.setIsSeeking(true)
            const onMove = (ev) => {
              const r = e.currentTarget.getBoundingClientRect()
              const p = ((ev.clientX - r.left) / r.width) * 100
              player.seek(p)
            }
            const onUp = () => {
              player.setIsSeeking(false)
              document.removeEventListener('mousemove', onMove)
              document.removeEventListener('mouseup', onUp)
            }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        >
          {/* Track */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 sm:h-1 bg-white/30 rounded-full sm:group-hover/progress:h-1.5 transition-all">
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full" style={{ width: `${player.buffered}%` }} />
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 bg-primary-500 rounded-full" style={{ width: `${player.progressPercent}%` }} />
            {/* Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-primary-500 rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `calc(${player.progressPercent}% - 5px)` }} />
          </div>
          {/* Time Tooltip */}
          {player.showTimeTooltip && (
            <div className="absolute -top-8 transform -translate-x-1/2 px-2 py-1 rounded bg-black/80 text-white text-xs pointer-events-none" style={{ left: `${player.timeTooltipPos}%` }}>
              {player.timeTooltipText}
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Play/Pause */}
            <button onClick={player.togglePlay} className="vp-btn p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white" title="播放/暂停 (Space)">
              <Icon icon={player.playing ? 'lucide:pause' : 'lucide:play'} width={16} height={16} className="sm:w-5 sm:h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-0.5 sm:gap-1 group/vol">
              <button onClick={player.toggleMute} className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white" title="静音 (M)">
                <Icon icon={player.muted || player.volume === 0 ? 'lucide:volume-x' : player.volume < 0.5 ? 'lucide:volume-1' : 'lucide:volume-2'} width={16} height={16} className="sm:w-5 sm:h-5" />
              </button>
              <div className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all overflow-hidden">
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={player.muted ? 0 : player.volume}
                  onChange={(e) => player.setVideoVolume(parseFloat(e.target.value))}
                  className="w-full h-1 accent-primary-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-white text-[10px] sm:text-xs font-mono ml-1 sm:ml-2">
              {player.formatTime(player.currentTime)} / {player.formatTime(player.duration)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => player.setShowSpeedMenu(!player.showSpeedMenu)}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full hover:bg-white/10 transition-colors text-white text-[10px] sm:text-xs font-mono min-w-[34px] sm:min-w-[40px]"
                title="播放速度"
              >
                {player.speed}x
              </button>
              {player.showSpeedMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-dark-800/95 backdrop-blur rounded-xl py-1 shadow-xl border border-dark-600 min-w-[90px] sm:min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                  {player.speedOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => player.setVideoSpeed(s)}
                      className={cn('w-full px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-left hover:bg-white/10 transition-colors text-white', player.speed === s && 'text-primary-400 font-bold')}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality */}
            {player.qualities.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => player.setShowQualityMenu(!player.showQualityMenu)}
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full hover:bg-white/10 transition-colors text-white text-[10px] sm:text-xs"
                  title="画质"
                >
                  {player.currentQuality === 'auto' ? '画质(自动)' : player.currentQuality}
                </button>
                {player.showQualityMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-dark-800/95 backdrop-blur rounded-xl py-1 shadow-xl border border-dark-600 min-w-[120px] sm:min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => player.setVideoQuality('auto')} className={cn('w-full px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-left hover:bg-white/10 transition-colors text-white', player.currentQuality === 'auto' && 'text-primary-400 font-bold')}>自动</button>
                    {player.qualities.map((q) => (
                      <button key={q.quality} onClick={() => player.setVideoQuality(q.quality)} className={cn('w-full px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-left hover:bg-white/10 transition-colors text-white', player.currentQuality === q.quality && 'text-primary-400 font-bold')}>{q.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loop */}
            <button onClick={player.toggleLoop} className={cn('p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors', player.loop ? 'text-primary-400' : 'text-white')} title="循环播放 (L)">
              <Icon icon="lucide:repeat" width={14} height={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* Screenshot */}
            <button onClick={player.screenshot} className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white hidden sm:flex" title="截图">
              <Icon icon="lucide:camera" width={14} height={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* PiP */}
            <button onClick={player.togglePip} className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white hidden sm:flex" title="画中画 (P)">
              <Icon icon="lucide:picture-in-picture-2" width={14} height={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* Help */}
            <button onClick={() => player.setShowHelp(true)} className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white hidden sm:flex" title="快捷键">
              <Icon icon="lucide:keyboard" width={14} height={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* Fullscreen */}
            <button onClick={player.toggleFullscreen} className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-white" title="全屏 (F)">
              <Icon icon={player.fullscreen ? 'lucide:minimize' : 'lucide:maximize'} width={14} height={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {player.showHelp && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20" onClick={() => player.setShowHelp(false)}>
          <div className="bg-dark-800 rounded-2xl p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-heading font-bold">快捷键</h3>
              <button onClick={() => player.setShowHelp(false)} className="text-gray-400 hover:text-white">
                <Icon icon="lucide:x" width={20} height={20} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">播放/暂停</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">Space</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">快进/快退 5s</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">← →</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">长按 → 3x快放</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">长按 →</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">快进/快退 10s</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">L J</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">音量</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">↑ ↓</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">静音</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">M</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">全屏</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">F</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">画中画</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">P</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">循环</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">O</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">右键/长按视频</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">3x 快放</kbd></div>
              <div className="flex justify-between"><span className="text-gray-400">快捷键帮助</span><kbd className="text-white bg-dark-700 px-2 py-0.5 rounded">?</kbd></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
