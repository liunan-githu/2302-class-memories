import { useRef, useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

export default function SplitText({
  text,
  className,
  delay = 50,
  duration = 0.6,
  splitType = 'chars',
  threshold = 0.2,
  tag: Tag = 'span',
  textAlign = 'center',
  gradient = false,
  onComplete,
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  useEffect(() => {
    if (visible && onComplete) {
      const totalTime = (text.length || 1) * delay + duration * 1000
      const timer = setTimeout(onComplete, totalTime)
      return () => clearTimeout(timer)
    }
  }, [visible, onComplete, text.length, delay, duration])

  const chars = splitType === 'words' ? text.split(/(\s+)/) : [...text]

  return (
    <Tag
      ref={ref}
      className={cn('inline-block', gradient && 'split-gradient', className)}
      style={{ textAlign, whiteSpace: 'normal', wordWrap: 'break-word' }}
    >
      <style>{`
        @keyframes split-char-in {
          0%   { opacity: 0; transform: translateY(50px) scale(0.3) rotate(-8deg); }
          50%  { opacity: 1; transform: translateY(-5px) scale(1.08) rotate(1deg); }
          75%  { transform: translateY(2px) scale(0.97) rotate(-0.5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes split-word-in {
          0%   { opacity: 0; transform: translateY(30px) scale(0.7); }
          50%  { opacity: 1; transform: translateY(-3px) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .split-char {
          display: inline-block;
          opacity: 0;
          will-change: transform, opacity;
        }
        .split-char.visible {
          animation: split-char-in ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .split-word .split-char.visible {
          animation: split-word-in ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .split-gradient .split-char {
          background: linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #E11D48 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
      {chars.map((char, i) => (
        <span
          key={i}
          className={`split-char${visible ? ' visible' : ''}`}
          style={{
            animationDelay: visible ? `${i * delay}ms` : '0ms',
            visibility: visible ? 'visible' : 'hidden',
            ...(splitType === 'chars' && char === ' ' ? { minWidth: '0.3em' } : {}),
          }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </Tag>
  )
}
