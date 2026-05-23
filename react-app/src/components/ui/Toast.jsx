import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '../../utils/cn'

let toastId = 0
const listeners = new Set()

function notify(message, type = 'info', duration = 3000) {
  const id = ++toastId
  listeners.forEach((fn) => fn({ id, message, type, duration }))
  return id
}

export function toast(message, type) { return notify(message, type) }
toast.success = (msg) => notify(msg, 'success')
toast.error = (msg) => notify(msg, 'error')
toast.warning = (msg) => notify(msg, 'warning')

export function Toast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((t) => {
    setToasts((prev) => [...prev, t])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id))
    }, t.duration || 3000)
  }, [])

  useEffect(() => {
    listeners.add(addToast)
    // Listen for toast events from window
    const handler = (e) => { if (e.detail) addToast({ id: ++toastId, ...e.detail, duration: e.detail.duration || 3000 }) }
    window.addEventListener('toast', handler)
    return () => {
      listeners.delete(addToast)
      window.removeEventListener('toast', handler)
    }
  }, [addToast])

  const icons = { success: 'lucide:circle-check', error: 'lucide:circle-x', warning: 'lucide:triangle-alert', info: 'lucide:info' }
  const styles = {
    success: 'bg-success-500 text-white',
    error: 'bg-danger-500 text-white',
    warning: 'bg-warning-500 text-gray-900',
    info: 'bg-dark-800 text-white dark:bg-white dark:text-gray-900',
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-full shadow-lg animate-slide-up',
            styles[t.type] || styles.info,
          )}
        >
          <Icon icon={icons[t.type] || icons.info} width={18} height={18} />
          <span className="text-sm font-medium whitespace-nowrap">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
