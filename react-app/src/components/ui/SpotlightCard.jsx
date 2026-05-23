import { useRef } from 'react'

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.25)',
}) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ref.current.style.setProperty('--sx', `${x}px`)
    ref.current.style.setProperty('--sy', `${y}px`)
    ref.current.style.setProperty('--sc', spotlightColor)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`spotlight-card ${className}`}
      style={{ '--sx': '50%', '--sy': '50%', '--sc': spotlightColor }}
    >
      <div className="spotlight-glow" />
      <div className="spotlight-content">{children}</div>
    </div>
  )
}
