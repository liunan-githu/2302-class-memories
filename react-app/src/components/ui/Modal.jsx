import { useEffect } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '../../utils/cn'

export function Modal({ isOpen, onClose, title, children, className, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[98vw] max-h-[98vh]',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in-up" />
      <div
        className={cn(
          'relative glass w-full rounded-2xl shadow-xl animate-scale-in overflow-auto',
          sizes[size] || sizes.md,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100/30 dark:border-dark-700/30">
            <h3 className="text-lg font-heading font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
              <Icon icon="lucide:x" width={20} height={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
