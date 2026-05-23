import { useState, useCallback } from 'react'
import { api } from '../services/apiClient'

export function useUploadProgress() {
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [status, setStatus] = useState('idle')

  const upload = useCallback(async (url, formData) => {
    setStatus('uploading')
    setProgress(0)
    setSpeed(0)
    try {
      const result = await api.upload(url, formData, (pct, spd) => {
        setProgress(pct)
        setSpeed(spd)
      })
      setProgress(100)
      setStatus('complete')
      return result
    } catch (err) {
      setStatus('error')
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setProgress(0)
    setSpeed(0)
    setStatus('idle')
  }, [])

  return { upload, progress, speed, status, reset }
}
