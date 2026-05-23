import { useState } from 'react'
import { motion } from 'framer-motion'
import './Folder.css'

function darken(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function Folder({
  color = '#D97706',
  size = 220,
  icon,
  title,
  papers = [],
  className = '',
  onClick,
}) {
  const [open, setOpen] = useState(false)
  const darkColor = darken(color, 30)
  const lighterColor = darken(color, -20)

  return (
    <motion.button
      className={`folder-root ${className}`}
      style={{ width: size, '--folder-color': color, '--folder-dark': darkColor }}
      onClick={onClick}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Papers that fan out */}
      <div className="folder-papers" style={{ height: size * 0.5 }}>
        {papers.map((paper, i) => (
          <motion.div
            key={i}
            className="folder-paper"
            style={{
              backgroundColor: i === 0 ? '#fff' : i === 1 ? '#fefefe' : '#fafafa',
              zIndex: papers.length - i,
            }}
            animate={{
              y: open ? -(i * 28 + 16) : -(i * 4 + 4),
              x: open ? (i - Math.floor(papers.length / 2)) * 8 : 0,
              rotate: open ? (i - Math.floor(papers.length / 2)) * 5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.04 }}
          >
            <span className="folder-paper-line" style={{ width: `${60 + i * 10}%` }} />
            <span className="folder-paper-line short" style={{ width: `${40 + i * 8}%` }} />
          </motion.div>
        ))}
      </div>

      {/* Folder body */}
      <div
        className="folder-body"
        style={{
          backgroundColor: color,
          borderTopColor: lighterColor,
        }}
      >
        {/* Tab */}
        <div
          className="folder-tab"
          style={{ backgroundColor: darkColor }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="folder-content">
          <span className="folder-title">{title}</span>
          <span className="folder-hint">点击进入</span>
        </div>
      </div>
    </motion.button>
  )
}
