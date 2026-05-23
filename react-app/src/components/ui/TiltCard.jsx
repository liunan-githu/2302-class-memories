import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export function TiltCard({ children, className, glowColor = 'rgba(245, 158, 11, 0.15)', tiltAmount = 8, enableGlow = true }) {
  const ref = useRef(null)
  const [rotate, setRotate] = useState({ x: 0, y: 0 })
  const [glow, setGlow] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)

  const handleMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    setRotate({
      x: ((y - cy) / cy) * -tiltAmount,
      y: ((x - cx) / cx) * tiltAmount,
    })
    setGlow({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }, [tiltAmount])

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => {
    setRotate({ x: 0, y: 0 })
    setHovered(false)
  }, [])

  return (
    <motion.div
      ref={ref}
      className="relative [perspective:800px]"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className={className}
        animate={{ rotateX: rotate.x, rotateY: rotate.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
      {enableGlow && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500 -z-10"
          style={{
            opacity: hovered ? 1 : 0,
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${glowColor} 0%, transparent 50%)`,
          }}
        />
      )}
    </motion.div>
  )
}
