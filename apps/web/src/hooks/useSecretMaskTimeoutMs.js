import { useEffect, useState } from 'react'
import {
  getSecretMaskTimeoutMs,
  SECRET_MASK_TIMEOUT_EVENT,
} from '../services/storage/secretVisibilityStorage.js'

export function useSecretMaskTimeoutMs() {
  const [timeoutMs, setTimeoutMs] = useState(() => getSecretMaskTimeoutMs())

  useEffect(() => {
    function syncTimeout() {
      setTimeoutMs(getSecretMaskTimeoutMs())
    }

    function handleCustomTimeoutChange() {
      syncTimeout()
    }

    window.addEventListener('storage', syncTimeout)
    window.addEventListener(SECRET_MASK_TIMEOUT_EVENT, handleCustomTimeoutChange)

    return () => {
      window.removeEventListener('storage', syncTimeout)
      window.removeEventListener(SECRET_MASK_TIMEOUT_EVENT, handleCustomTimeoutChange)
    }
  }, [])

  return timeoutMs
}
