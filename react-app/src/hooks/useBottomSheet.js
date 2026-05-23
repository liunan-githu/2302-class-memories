import { useState, useCallback } from 'react'

export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState(null)
  const [fullScreen, setFullScreen] = useState(false)

  const open = useCallback((contentEl, options = {}) => {
    setContent(contentEl)
    setFullScreen(!!options.fullScreen)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => {
      setContent(null)
      setFullScreen(false)
    }, 350)
  }, [])

  return { isOpen, content, fullScreen, open, close }
}
