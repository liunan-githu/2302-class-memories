import { useState, useEffect, useRef } from 'react'

export default function Magnet({
  children,
  padding = 100,
  disabled = false,
  magnetStrength = 2,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.5s ease-in-out',
  wrapperClassName = '',
  innerClassName = '',
}) {
  const [isActive, setIsActive] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0, rotation: 0, scale: 1 })
  const magnetRef = useRef(null)

  useEffect(() => {
    if (disabled) {
      setPosition({ x: 0, y: 0, rotation: 0, scale: 1 })
      return
    }

    const handleMouseMove = (e) => {
      if (!magnetRef.current) return

      const { left, top, width, height } = magnetRef.current.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2
      const distX = Math.abs(centerX - e.clientX)
      const distY = Math.abs(centerY - e.clientY)

      if (distX < width / 2 + padding && distY < height / 2 + padding) {
        setIsActive(true)
        const tx = (e.clientX - centerX) / magnetStrength
        const ty = (e.clientY - centerY) / magnetStrength
        const rotation = (e.clientX - centerX) / (magnetStrength * 3)
        setPosition({ x: tx, y: ty, rotation, scale: 1.06 })
      } else {
        setIsActive(false)
        setPosition({ x: 0, y: 0, rotation: 0, scale: 1 })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [padding, disabled, magnetStrength])

  const transitionStyle = isActive ? activeTransition : inactiveTransition

  return (
    <div
      ref={magnetRef}
      className={wrapperClassName}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <div
        className={innerClassName}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) rotate(${position.rotation}deg) scale(${position.scale})`,
          transition: transitionStyle,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
