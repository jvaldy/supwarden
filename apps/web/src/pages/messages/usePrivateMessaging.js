import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchPrivateContacts,
  fetchPrivateMessages,
  sendPrivateMessage,
} from '../../services/api/messagingApi.js'
import { useMessageNotifications } from '../../hooks/useMessageNotifications.js'

export function usePrivateMessaging(token) {
  const composerFormRef = useRef(null)
  const threadListRef = useRef(null)
  const shouldStickToBottomRef = useRef(true)
  const refreshNotificationsRef = useRef(() => Promise.resolve())

  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [messages, setMessages] = useState([])
  const [oldestMessageDate, setOldestMessageDate] = useState('')
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const [hasPendingMessages, setHasPendingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { privateUnreadCount: totalUnreadCount, refreshNotifications } = useMessageNotifications(token)
  const selectedContactIdKey = selectedContactId !== null ? String(selectedContactId) : ''

  useEffect(() => {
    refreshNotificationsRef.current = refreshNotifications
  }, [refreshNotifications])

  function applyContactsPayload(responseData, preserveSelection = true) {
    const nextContacts = Array.isArray(responseData.contacts) ? responseData.contacts : []
    setContacts(nextContacts)

    setSelectedContactId((currentValue) => {
      if (!preserveSelection) {
        return nextContacts[0]?.id ?? null
      }

      if (currentValue !== null && nextContacts.some((contact) => String(contact.id) === String(currentValue))) {
        return currentValue
      }

      return nextContacts[0]?.id ?? null
    })
  }

  function markConversationAsReadLocally(contactId, unreadMarkedCount = 0) {
    if (!contactId || unreadMarkedCount <= 0) return

    setContacts((currentContacts) =>
      currentContacts.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              unreadCount: 0,
            }
          : contact,
      ),
    )
  }

  useEffect(() => {
    let isCancelled = false

    async function loadContacts() {
      setIsLoadingContacts(true)
      setErrorMessage('')

      try {
        const responseData = await fetchPrivateContacts(token)
        if (!isCancelled) {
          applyContactsPayload(responseData)
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.responseData?.message ?? 'Impossible de charger vos conversations privées.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingContacts(false)
        }
      }
    }

    if (token) {
      loadContacts()
    }

    return () => {
      isCancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token || isLoadingContacts) return undefined

    let isCancelled = false

    async function refreshContactsFromNotifications() {
      try {
        const responseData = await fetchPrivateContacts(token)
        if (!isCancelled) {
          applyContactsPayload(responseData)
        }
      } catch {
        // Ignore un échec ponctuel pour éviter de casser l'écran pendant le polling.
      }
    }

    refreshContactsFromNotifications()

    return () => {
      isCancelled = true
    }
  }, [isLoadingContacts, token, totalUnreadCount])

  useEffect(() => {
    if (!token || isLoadingContacts) return undefined

    const intervalId = window.setInterval(async () => {
      try {
        const responseData = await fetchPrivateContacts(token)
        applyContactsPayload(responseData)
      } catch {
        // Ignore un échec ponctuel pour éviter de casser l'écran pendant le polling.
      }
    }, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isLoadingContacts, token])

  useEffect(() => {
    if (!selectedContactId || !token) return undefined

    let isCancelled = false

    async function loadConversation() {
      setIsLoadingMessages(true)
      setErrorMessage('')

      try {
        const responseData = await fetchPrivateMessages(token, selectedContactId, { limit: 80 })
        const unreadMarkedCount = Number(responseData.unreadMarkedCount) || 0
        const incomingMessages = Array.isArray(responseData.messages) ? responseData.messages : []

        if (!isCancelled) {
          setMessages(incomingMessages)
          setOldestMessageDate(incomingMessages[0]?.createdAt ?? '')
          setHasOlderMessages(Boolean(responseData.hasMoreBefore))
          markConversationAsReadLocally(selectedContactId, unreadMarkedCount)
          if (unreadMarkedCount > 0) {
            refreshNotificationsRef.current().catch(() => {})
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.responseData?.message ?? 'Impossible de charger cette conversation.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false)
        }
      }
    }

    loadConversation()

    return () => {
      isCancelled = true
    }
  }, [selectedContactId, token])

  async function handleLoadOlderMessages() {
    if (!selectedContactId || !token || !oldestMessageDate || isLoadingOlderMessages) {
      return
    }

    setIsLoadingOlderMessages(true)

    try {
      const responseData = await fetchPrivateMessages(token, selectedContactId, {
        limit: 40,
        before: oldestMessageDate,
      })

      const olderMessages = Array.isArray(responseData.messages) ? responseData.messages : []
      if (olderMessages.length === 0) {
        setHasOlderMessages(false)
        return
      }

      shouldStickToBottomRef.current = false
      setMessages((currentMessages) => {
        const knownIds = new Set(currentMessages.map((message) => message.id))
        const deduplicatedOlderMessages = olderMessages.filter((message) => !knownIds.has(message.id))
        return [...deduplicatedOlderMessages, ...currentMessages]
      })

      setOldestMessageDate(olderMessages[0]?.createdAt ?? oldestMessageDate)
      setHasOlderMessages(Boolean(responseData.hasMoreBefore))
    } catch {
      // Garde la liste actuelle si le chargement intermédiaire échoue.
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }

  useEffect(() => {
    if (!selectedContactId || !token) return undefined

    const intervalId = window.setInterval(async () => {
      try {
        const responseData = await fetchPrivateMessages(token, selectedContactId, { limit: 120 })
        const incomingMessages = Array.isArray(responseData.messages) ? responseData.messages : []
        const unreadMarkedCount = Number(responseData.unreadMarkedCount) || 0

        setMessages(incomingMessages)

        if (unreadMarkedCount > 0) {
          markConversationAsReadLocally(selectedContactId, unreadMarkedCount)
          refreshNotificationsRef.current().catch(() => {})
        }
      } catch {
        // Ignore un échec ponctuel pendant la mise à jour live.
      }
    }, 1200)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [selectedContactId, token])

  useEffect(() => {
    if (!selectedContactId || !token) return undefined

    async function refreshNow() {
      try {
        const responseData = await fetchPrivateMessages(token, selectedContactId, { limit: 120 })
        const incomingMessages = Array.isArray(responseData.messages) ? responseData.messages : []
        const unreadMarkedCount = Number(responseData.unreadMarkedCount) || 0

        setMessages(incomingMessages)

        if (unreadMarkedCount > 0) {
          markConversationAsReadLocally(selectedContactId, unreadMarkedCount)
          refreshNotificationsRef.current().catch(() => {})
        }
      } catch {
        // Ignore un échec ponctuel au retour de focus.
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        refreshNow().catch(() => {})
      }
    }

    function handleWindowFocus() {
      refreshNow().catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [selectedContactId, token])

  useEffect(() => {
    const threadElement = threadListRef.current
    if (!threadElement) return

    if (shouldStickToBottomRef.current) {
      threadElement.scrollTop = threadElement.scrollHeight
      setHasPendingMessages(false)
    } else if (messages.length > 0) {
      setHasPendingMessages(true)
    }
  }, [messages, selectedContactId])

  useEffect(() => {
    shouldStickToBottomRef.current = true
    setHasPendingMessages(false)
    setOldestMessageDate('')
    setHasOlderMessages(false)
  }, [selectedContactId])

  function isNearBottom(element) {
    const remainingDistance = element.scrollHeight - element.scrollTop - element.clientHeight
    return remainingDistance <= 64
  }

  function handleThreadScroll(event) {
    const element = event.currentTarget
    const isCurrentlyNearBottom = isNearBottom(element)
    shouldStickToBottomRef.current = isCurrentlyNearBottom

    if (isCurrentlyNearBottom) {
      setHasPendingMessages(false)
    }
  }

  function scrollConversationToBottom() {
    const threadElement = threadListRef.current
    if (!threadElement) return

    shouldStickToBottomRef.current = true
    threadElement.scrollTop = threadElement.scrollHeight
    setHasPendingMessages(false)
  }

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!selectedContactId || messageInput.trim() === '') {
      return
    }

    setIsSending(true)
    setErrorMessage('')

    try {
      const responseData = await sendPrivateMessage(token, selectedContactId, messageInput)
      const createdMessage = responseData.message

      if (createdMessage) {
        shouldStickToBottomRef.current = true
        setMessages((currentValue) => [...currentValue, createdMessage])
      }

      setMessageInput('')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible d’envoyer ce message pour le moment.')
    } finally {
      setIsSending(false)
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      composerFormRef.current?.requestSubmit()
    }
  }

  const selectedContact = useMemo(
    () => contacts.find((contact) => String(contact.id) === selectedContactIdKey) ?? null,
    [contacts, selectedContactIdKey],
  )

  return {
    contacts,
    selectedContact,
    selectedContactId,
    selectedContactIdKey,
    messages,
    hasOlderMessages,
    isLoadingOlderMessages,
    hasPendingMessages,
    messageInput,
    isLoadingContacts,
    isLoadingMessages,
    isSending,
    errorMessage,
    totalUnreadCount,
    composerFormRef,
    threadListRef,
    setSelectedContactId,
    setMessageInput,
    handleLoadOlderMessages,
    handleThreadScroll,
    handleSendMessage,
    handleComposerKeyDown,
    scrollConversationToBottom,
  }
}

