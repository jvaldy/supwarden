import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import {
  fetchPrivateContacts,
  fetchPrivateMessages,
  sendPrivateMessage,
} from '../../services/api/messagingApi.js'
import { useMessageNotifications } from '../../hooks/useMessageNotifications.js'

function formatContactOption(contact) {
  const unreadSuffix = contact.unreadCount > 0 ? ` (\u{1F4AC} ${contact.unreadCount})` : ''
  return `${contact.displayName} - ${contact.email}${unreadSuffix}`
}

export function MessagesPage() {
  const { token } = useAuth()
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
    if (!contactId || unreadMarkedCount <= 0) {
      return
    }

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
        if (isCancelled) return
        applyContactsPayload(responseData)
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.responseData?.message ?? 'Impossible de charger vos conversations privées.')
        }
      } finally {
        if (!isCancelled) setIsLoadingContacts(false)
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
    if (!token || isLoadingContacts) {
      return undefined
    }

    let isCancelled = false

    async function refreshContactsFromNotifications() {
      try {
        const responseData = await fetchPrivateContacts(token)
        if (!isCancelled) {
          applyContactsPayload(responseData)
        }
      } catch {
        // Évite de perturber l'écran en cas d'échec ponctuel.
      }
    }

    refreshContactsFromNotifications()

    return () => {
      isCancelled = true
    }
  }, [isLoadingContacts, token, totalUnreadCount])

  useEffect(() => {
    if (!token || isLoadingContacts) {
      return undefined
    }

    const intervalId = window.setInterval(async () => {
      try {
        const responseData = await fetchPrivateContacts(token)
        applyContactsPayload(responseData)
      } catch {
        // Garde l'état courant si un rafraîchissement ponctuel échoue.
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
        if (!isCancelled) setIsLoadingMessages(false)
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
      // On garde la liste courante si un chargement intermédiaire échoue.
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }

  useEffect(() => {
    if (!selectedContactId || !token) return undefined

    const pollIntervalMs = 1200

    const intervalId = window.setInterval(async () => {
      try {
        const responseData = await fetchPrivateMessages(token, selectedContactId, {
          limit: 120,
        })

        const incomingMessages = Array.isArray(responseData.messages) ? responseData.messages : []
        const unreadMarkedCount = Number(responseData.unreadMarkedCount) || 0

        setMessages(incomingMessages)

        if (unreadMarkedCount > 0) {
          markConversationAsReadLocally(selectedContactId, unreadMarkedCount)
          refreshNotificationsRef.current().catch(() => {})
        }
      } catch {
        // Évite de bloquer l'écran en cas d'échec ponctuel du rafraîchissement.
      }
    }, pollIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [selectedContactId, token])

  useEffect(() => {
    if (!selectedContactId || !token) {
      return undefined
    }

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
        // Ignore les erreurs ponctuelles au retour de focus.
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
    if (!threadElement) {
      return
    }

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

  return (
    <section className="dashboard-shell messaging-shell">
      <article className="auth-card messaging-card">
        <p className="eyebrow">Messagerie privée</p>
        <h1 className="dashboard-title">Discutez en direct avec vos collaborateurs.</h1>
        <p className="lede">Sélectionnez un contact, consultez l’historique et envoyez vos messages sans quitter Supwarden.</p>

        {errorMessage ? <div className="feedback-banner feedback-banner-error">{errorMessage}</div> : null}

        <section className="status-card messaging-unified-card">
          <div className="messaging-contacts-section">
            <div className="messaging-section-heading">
              <div>
                <p className="messaging-panel-label">Contacts</p>
                <h2>Choisissez une conversation</h2>
              </div>
              <div className="messaging-header-badges">
                <span className="messaging-thread-meta">{contacts.length} contact{contacts.length > 1 ? 's' : ''}</span>
                {totalUnreadCount > 0 ? <span className="messaging-unread-pill"><MessageIcon /><span>{totalUnreadCount} non lu{totalUnreadCount > 1 ? 's' : ''}</span></span> : null}
              </div>
            </div>

            {isLoadingContacts ? (
              <p className="field-help">Chargement des contacts...</p>
            ) : contacts.length > 0 ? (
              <label className="field messaging-select-field">
                <span className="messaging-select-label"><MessageIcon /><span>Mes conversations</span></span>
                <select value={selectedContactIdKey} onChange={(event) => setSelectedContactId(event.target.value)}>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={String(contact.id)}>
                      {formatContactOption(contact)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="field-help">Aucun contact disponible pour le moment.</p>
            )}
          </div>

          <div className="messaging-conversation-section">
            <header className="messaging-thread-header">
              <div>
                <p className="messaging-panel-label">Conversation</p>
                <h2>{selectedContact ? selectedContact.displayName : 'Conversation privée'}</h2>
              </div>
              {selectedContact ? (
                <div className="messaging-header-badges">
                  {selectedContact.unreadCount > 0 ? <span className="messaging-unread-pill"><MessageIcon /><span>{selectedContact.unreadCount}</span></span> : null}
                  <span className="messaging-thread-meta"><MessageIcon /><span>Messagerie privée</span></span>
                </div>
              ) : null}
            </header>

            {isLoadingMessages ? <p className="field-help">Chargement des messages...</p> : null}

            <div className="messaging-thread-list" aria-live="polite" ref={threadListRef} onScroll={handleThreadScroll}>
              {hasOlderMessages ? (
                <div className="modal-actions">
                  <button className="button-link button-link-tertiary" type="button" onClick={handleLoadOlderMessages} disabled={isLoadingOlderMessages}>
                    {isLoadingOlderMessages ? 'Chargement...' : 'Charger les messages précédents'}
                  </button>
                </div>
              ) : null}

              {messages.map((message, index) => {
                const isSelf = Boolean(message.sender?.isCurrentUser)
                const previousMessage = messages[index - 1]
                const isGrouped = previousMessage?.sender?.id === message.sender?.id
                const formattedDateTime = new Date(message.createdAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const deliveryLabel = isSelf ? (message.isRead ? 'Lu' : 'Envoyé') : null

                return (
                  <article key={message.id} className={isSelf ? 'messaging-row messaging-row-self' : 'messaging-row'}>
                    {!isSelf && !isGrouped ? (
                      <span className="messaging-avatar" aria-hidden="true">
                        {(message.sender?.displayName ?? 'U').trim().charAt(0).toUpperCase() || 'U'}
                      </span>
                    ) : null}
                    {!isSelf && isGrouped ? <span className="messaging-avatar-spacer" aria-hidden="true" /> : null}

                    <div className={isSelf ? 'messaging-bubble messaging-bubble-self' : 'messaging-bubble'}>
                      <header>
                        <strong>{isSelf ? 'Vous' : (message.sender?.displayName ?? 'Utilisateur')}</strong>
                        <time dateTime={message.createdAt}>{formattedDateTime}</time>
                      </header>
                      <p>{message.content}</p>
                      {deliveryLabel ? <span className="messaging-message-status">{deliveryLabel}</span> : null}
                    </div>
                  </article>
                )
              })}

              {messages.length === 0 && !isLoadingMessages ? (
                <div className="messaging-empty-state">
                  <p>Commencez la conversation avec ce contact.</p>
                </div>
              ) : null}
            </div>

            {hasPendingMessages ? (
              <div className="modal-actions">
                <button className="button-link button-link-secondary" type="button" onClick={scrollConversationToBottom}>
                  Voir les nouveaux messages
                </button>
              </div>
            ) : null}

            <form className="messaging-composer" onSubmit={handleSendMessage} ref={composerFormRef}>
              <textarea
                className="messaging-composer-input"
                rows={1}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Écrivez votre message..."
                disabled={!selectedContactId}
              />
              <button className="button-link button-link-primary messaging-send-button" type="submit" disabled={isSending || !selectedContactId || messageInput.trim() === ''}>
                Envoyer
              </button>
            </form>
          </div>
        </section>
      </article>
    </section>
  )
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8A1.5 1.5 0 0 1 19 17.5H8l-4.5 3V8A1.5 1.5 0 0 1 5 6.5Z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  )
}



