import { useState, useEffect, useRef, useCallback } from 'react'

export function useVideoPlayer(videoEl, containerRef) {
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(() => {
    const v = localStorage.getItem('vp_volume')
    return v !== null ? parseFloat(v) : 1
  })
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [qualities, setQualities] = useState([])
  const [currentQuality, setCurrentQuality] = useState('auto')
  const [isSeeking, setIsSeeking] = useState(false)
  const [showTimeTooltip, setShowTimeTooltip] = useState(false)
  const [timeTooltipPos, setTimeTooltipPos] = useState(0)
  const [timeTooltipText, setTimeTooltipText] = useState('')
  const [buffering, setBuffering] = useState(false)
  const [longPressing, setLongPressing] = useState(false)

  const controlsTimer = useRef(null)
  const posSaveTimer = useRef(null)
  const isDragging = useRef(false)
  const lastVolume = useRef(1)
  const videoRef = useRef(null)
  const preLongPressSpeed = useRef(1)
  const skipTimer = useRef(null)
  const currentTimeRef = useRef(0)

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  useEffect(() => {
    const v = videoEl
    if (!v) return
    videoRef.current = v

    const onTimeUpdate = () => {
      if (!isDragging.current) setCurrentTime(v.currentTime)
      currentTimeRef.current = v.currentTime
      if (v.duration) {
        let buf = 0
        try {
          if (v.buffered.length > 0) buf = v.buffered.end(v.buffered.length - 1) / v.duration * 100
        } catch {}
        setBuffered(buf)
      }
    }
    const onLoadedMetadata = () => setDuration(v.duration || 0)
    const onPlay = () => { setPlaying(true); setPaused(false); setBuffering(false) }
    const onPause = () => { setPlaying(false); setPaused(true) }
    const onEnded = () => { setPlaying(false); setPaused(true) }
    const onVolumeChange = () => {
      setVolume(v.volume)
      setMuted(v.muted)
    }
    const onDurationChange = () => setDuration(v.duration || 0)
    const onWaiting = () => setBuffering(true)
    const onCanPlay = () => setBuffering(false)

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onLoadedMetadata)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)
    v.addEventListener('volumechange', onVolumeChange)
    v.addEventListener('durationchange', onDurationChange)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)

    v.volume = volume
    v.muted = muted

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onLoadedMetadata)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('volumechange', onVolumeChange)
      v.removeEventListener('durationchange', onDurationChange)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
    }
  }, [videoEl])

  // Controls auto-hide
  useEffect(() => {
    if (!playing) return
    if (controlsVisible) {
      clearTimeout(controlsTimer.current)
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
    return () => clearTimeout(controlsTimer.current)
  }, [playing, controlsVisible])

  // Save position for resume
  useEffect(() => {
    if (playing) {
      posSaveTimer.current = setInterval(() => {
        try { sessionStorage.setItem('vp_pos_playback', String(currentTimeRef.current)) } catch {}
      }, 1000)
    }
    return () => clearInterval(posSaveTimer.current)
  }, [playing])

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const togglePlay = useCallback((e) => {
    if (e) e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}) }
    else v.pause()
  }, [])

  const seek = useCallback((percent) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    v.currentTime = (percent / 100) * v.duration
    setCurrentTime(v.currentTime)
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.muted) {
      v.muted = false
      v.volume = lastVolume.current
    } else {
      lastVolume.current = v.volume || 1
      v.muted = true
    }
    setMuted(v.muted)
    setVolume(v.volume)
  }, [])

  const setVideoVolume = useCallback((val) => {
    const v = videoRef.current
    if (!v) return
    v.volume = val
    v.muted = false
    setVolume(val)
    setMuted(false)
    try { localStorage.setItem('vp_volume', String(val)) } catch {}
  }, [])

  const setVideoSpeed = useCallback((s) => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = s
    setSpeed(s)
    setShowSpeedMenu(false)
    setFeedback({ icon: '▶', text: `${s}x` })
    setTimeout(() => setFeedback(null), 800)
  }, [])

  // Rank qualities by numeric height (higher = better)
  const rankQuality = useCallback((q) => {
    const num = parseInt(q.quality || q.label, 10)
    return isNaN(num) ? 0 : num
  }, [])

  // Pick best quality for estimated bandwidth (Mbps)
  const pickQualityForBandwidth = useCallback((mbps) => {
    const sorted = [...qualities].sort((a, b) => rankQuality(b) - rankQuality(a))
    if (sorted.length === 0) return null
    if (mbps >= 10) return sorted[0]
    if (mbps >= 5) return sorted.find((q) => rankQuality(q) <= 1080) || sorted[Math.min(1, sorted.length - 1)]
    if (mbps >= 2) return sorted.find((q) => rankQuality(q) <= 720) || sorted[Math.min(Math.floor(sorted.length / 2), sorted.length - 1)]
    return sorted[sorted.length - 1]
  }, [qualities, rankQuality])

  const applyQuality = useCallback((q, label) => {
    const v = videoRef.current
    if (!v || !q) return
    const ct = v.currentTime
    const wasPlaying = !v.paused
    const onReady = () => {
      v.currentTime = ct
      if (wasPlaying) v.play().catch(() => {})
    }
    v.addEventListener('loadedmetadata', onReady, { once: true })
    v.src = q.url
    setFeedback({ icon: '📺', text: label || q.label })
    setTimeout(() => setFeedback(null), 800)
  }, [])

  const setVideoQuality = useCallback((q) => {
    const v = videoRef.current
    if (!v) return
    setShowQualityMenu(false)

    if (q === 'auto') {
      setCurrentQuality('auto')
      let mbps = 5 // default assumption
      try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (conn?.downlink) mbps = conn.downlink
      } catch {}
      const best = pickQualityForBandwidth(mbps)
      if (best) applyQuality(best, best.label)
      return
    }

    setCurrentQuality(q)
    const target = qualities.find((item) => item.quality === q)
    if (!target) return
    applyQuality(target, target.label || `${q}P`)
  }, [qualities, pickQualityForBandwidth, applyQuality])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      containerRef.current.requestFullscreen().catch(() => {})
    }
  }, [containerRef])

  const togglePip = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await v.requestPictureInPicture()
      }
    } catch {}
  }, [])

  const toggleLoop = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.loop = !v.loop
    setLoop(v.loop)
  }, [])

  const screenshot = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = v.videoWidth
      canvas.height = v.videoHeight
      canvas.getContext('2d').drawImage(v, 0, 0)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `screenshot-${Date.now()}.png`
      a.click()
      setFeedback({ icon: '📷', text: '已截图' })
      setTimeout(() => setFeedback(null), 800)
    } catch {}
  }, [])

  // Auto-detect quality when qualities are loaded and video is ready
  const autoDetected = useRef(false)
  useEffect(() => {
    if (qualities.length === 0 || autoDetected.current) return
    const v = videoRef.current || videoEl
    if (!v || !v.duration) return
    autoDetected.current = true
    let mbps = 5
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (conn?.downlink) mbps = conn.downlink
    } catch {}
    const best = pickQualityForBandwidth(mbps)
    if (best) applyQuality(best, best.label)
  }, [qualities, videoEl, pickQualityForBandwidth, applyQuality])

  const skipTime = useCallback((seconds) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds))
    setFeedback({ icon: seconds > 0 ? '⏩' : '⏪', text: `${Math.abs(seconds)}s` })
    setTimeout(() => setFeedback(null), 800)
  }, [])

  const longPressingRef = useRef(false)

  const startLongPress = useCallback(() => {
    const v = videoRef.current
    if (!v || v.paused) return
    preLongPressSpeed.current = v.playbackRate
    v.playbackRate = 3
    setSpeed(3)
    longPressingRef.current = true
    setLongPressing(true)
  }, [])

  const stopLongPress = useCallback(() => {
    const v = videoRef.current
    if (!v || !longPressingRef.current) return
    v.playbackRate = preLongPressSpeed.current
    setSpeed(preLongPressSpeed.current)
    longPressingRef.current = false
    setLongPressing(false)
  }, [])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(controlsTimer.current)
    if (playing) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [playing])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      // Ignore key repeats for non-speed keys
      if (e.repeat && !['ArrowRight', 'ArrowLeft'].includes(e.key)) return
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break
        case 'ArrowLeft': e.preventDefault(); skipTime(-5); break
        case 'ArrowRight': {
          e.preventDefault()
          if (e.repeat) return
          skipTimer.current = setTimeout(() => {
            skipTimer.current = null
            startLongPress()
          }, 400)
          break
        }
        case 'j': skipTime(-10); break
        case 'l': skipTime(10); break
        case 'ArrowUp': e.preventDefault(); setVideoVolume(Math.min(1, volume + 0.1)); break
        case 'ArrowDown': e.preventDefault(); setVideoVolume(Math.max(0, volume - 0.1)); break
        case 'm': toggleMute(); break
        case 'f': toggleFullscreen(); break
        case 'p': togglePip(); break
        case 'o': toggleLoop(); break
        case '?': setShowHelp(true); break
        case 'Escape': setShowHelp(false); break
      }
    }
    const keyupHandler = (e) => {
      if (e.key === 'ArrowRight') {
        if (skipTimer.current) {
          clearTimeout(skipTimer.current)
          skipTimer.current = null
          skipTime(5)
        }
        if (longPressingRef.current) stopLongPress()
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', keyupHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', keyupHandler)
    }
  }, [togglePlay, skipTime, toggleMute, toggleFullscreen, togglePip, toggleLoop, setVideoVolume, volume, startLongPress, stopLongPress])

  const formatTime = (s) => {
    if (!s || s <= 0) return '00:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    const pad = (n) => String(n).padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return {
    playing, paused, currentTime, duration, buffered, volume, muted, speed, loop,
    fullscreen, controlsVisible, feedback, showSpeedMenu, showQualityMenu,
    showHelp, qualities, currentQuality, speedOptions,
    formatTime, progressPercent, buffering,
    showTimeTooltip, timeTooltipPos, timeTooltipText, longPressing,
    setQualities, setShowSpeedMenu, setShowQualityMenu, setShowHelp,
    setShowTimeTooltip, setTimeTooltipPos, setTimeTooltipText,
    togglePlay, seek, toggleMute, setVideoVolume, setVideoSpeed,
    setVideoQuality, toggleFullscreen, togglePip, toggleLoop,
    screenshot, skipTime, showControls, setIsSeeking,
    startLongPress, stopLongPress,
  }
}
