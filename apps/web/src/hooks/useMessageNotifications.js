import { useEffect, useState } from 'react'
import { fetchNotificationStreamConfig } from '../services/api/notificationApi.js'

const listeners = new Set()
let notificationState = {
  privateUnreadCount: 0,
  vaultUnreadCount: 0,
  vaultUnreadCountsById: {},
}
let currentToken = null
let streamConfigPromise = null
let eventSource = null

function emit() {
  listeners.forEach((listener) => listener(notificationState))
}

function setNotificationState(nextState) {
  notificationState = {
    privateUnreadCount: Math.max(0, Number(nextState.privateUnreadCount) || 0),
    vaultUnreadCount: Math.max(0, Number(nextState.vaultUnreadCount) || 0),
    vaultUnreadCountsById: nextState.vaultUnreadCountsById ?? {},
  }
  emit()
}

function normalizeCounts(payload) {
  return {
    privateUnreadCount: Math.max(0, Number(payload?.privateUnreadCount) || 0),
    vaultUnreadCount: Math.max(0, Number(payload?.vaultUnreadCount) || 0),
    vaultUnreadCountsById: payload?.vaultUnreadCountsById ?? {},
  }
}

async function loadStreamConfig(token) {
  if (!token) {
    setNotificationState({ privateUnreadCount: 0, vaultUnreadCount: 0, vaultUnreadCountsById: {} })
    return null
  }

  if (streamConfigPromise) {
    return streamConfigPromise
  }

  streamConfigPromise = fetchNotificationStreamConfig(token)
    .then((responseData) => {
      setNotificationState(normalizeCounts(responseData?.counts ?? {}))
      return responseData
    })
    .finally(() => {
      streamConfigPromise = null
    })

  return streamConfigPromise
}

async function ensureMercureSubscription(token) {
  if (!token) {
    closeMercureSubscription()
    setNotificationState({ privateUnreadCount: 0, vaultUnreadCount: 0, vaultUnreadCountsById: {} })
    return
  }

  if (eventSource !== null && currentToken === token) {
    return
  }

  closeMercureSubscription()
  currentToken = token

  const responseData = await loadStreamConfig(token)
  const hubUrl = responseData?.hubUrl
  const topic = responseData?.topic

  if (typeof hubUrl !== 'string' || hubUrl.trim() === '' || typeof topic !== 'string' || topic.trim() === '') {
    return
  }

  const url = new URL(hubUrl)
  url.searchParams.append('topic', topic)

  eventSource = new EventSource(url.toString())
  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      if (payload?.type === 'notifications.updated') {
        setNotificationState(normalizeCounts(payload.counts ?? {}))
      }
    } catch {
      // Ignore malformed events.
    }
  }
  eventSource.onerror = () => {
    closeMercureSubscription(false)
    window.setTimeout(() => {
      if (currentToken === token) {
        ensureMercureSubscription(token).catch(() => {
          // Keep the last known state if reconnection fails.
        })
      }
    }, 3000)
  }
}

function closeMercureSubscription(resetToken = true) {
  if (eventSource !== null) {
    eventSource.close()
    eventSource = null
  }

  if (resetToken) {
    currentToken = null
  }
}

export function useMessageNotifications(token, options = {}) {
  const { enabled = true, refreshIntervalMs = 3000 } = options
  const [counts, setCounts] = useState(notificationState)

  useEffect(() => {
    function handleStateChange(nextState) {
      setCounts(nextState)
    }

    listeners.add(handleStateChange)

    if (enabled && token) {
      ensureMercureSubscription(token).catch(() => {
        // Keep the latest known state if the stream setup fails.
      })
    } else if (!token) {
      setNotificationState({ privateUnreadCount: 0, vaultUnreadCount: 0, vaultUnreadCountsById: {} })
      closeMercureSubscription()
    }

    return () => {
      listeners.delete(handleStateChange)
    }
  }, [enabled, token])

  useEffect(() => {
    if (!enabled || !token) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      loadStreamConfig(token).catch(() => {
        // Fallback silencieux en cas d'erreur temporaire du flux Mercure.
      })
    }, Math.max(2000, Number(refreshIntervalMs) || 3000))

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled, refreshIntervalMs, token])

  useEffect(() => {
    if (!enabled || !token) {
      return undefined
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        loadStreamConfig(token).catch(() => {
          // Ignore les erreurs ponctuelles au retour d'onglet.
        })
      }
    }

    function handleWindowFocus() {
      loadStreamConfig(token).catch(() => {
        // Ignore les erreurs ponctuelles au retour de focus.
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [enabled, token])

  return {
    privateUnreadCount: counts.privateUnreadCount,
    vaultUnreadCount: counts.vaultUnreadCount,
    vaultUnreadCountsById: counts.vaultUnreadCountsById,
    async refreshNotifications() {
      const responseData = await loadStreamConfig(token)
      return responseData?.counts ?? null
    },
  }
}
