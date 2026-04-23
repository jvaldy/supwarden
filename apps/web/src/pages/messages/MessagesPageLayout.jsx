import { formatContactOption, formatMessageTimestamp, getDisplayInitial } from './messagesUtils.js'

export function MessagesPageLayout({
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
  onSelectContact,
  onMessageInputChange,
  onLoadOlderMessages,
  onThreadScroll,
  onSendMessage,
  onComposerKeyDown,
  onScrollToBottom,
}) {
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
                <select value={selectedContactIdKey} onChange={(event) => onSelectContact(event.target.value)}>
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

            <div className="messaging-thread-list" aria-live="polite" ref={threadListRef} onScroll={onThreadScroll}>
              {hasOlderMessages ? (
                <div className="modal-actions">
                  <button className="button-link button-link-tertiary" type="button" onClick={onLoadOlderMessages} disabled={isLoadingOlderMessages}>
                    {isLoadingOlderMessages ? 'Chargement...' : 'Charger les messages précédents'}
                  </button>
                </div>
              ) : null}

              {messages.map((message, index) => {
                const isSelf = Boolean(message.sender?.isCurrentUser)
                const previousMessage = messages[index - 1]
                const isGrouped = previousMessage?.sender?.id === message.sender?.id
                const deliveryLabel = isSelf ? (message.isRead ? 'Lu' : 'Envoyé') : null

                return (
                  <article key={message.id} className={isSelf ? 'messaging-row messaging-row-self' : 'messaging-row'}>
                    {!isSelf && !isGrouped ? (
                      <span className="messaging-avatar" aria-hidden="true">
                        {getDisplayInitial(message.sender?.displayName)}
                      </span>
                    ) : null}
                    {!isSelf && isGrouped ? <span className="messaging-avatar-spacer" aria-hidden="true" /> : null}

                    <div className={isSelf ? 'messaging-bubble messaging-bubble-self' : 'messaging-bubble'}>
                      <header>
                        <strong>{isSelf ? 'Vous' : (message.sender?.displayName ?? 'Utilisateur')}</strong>
                        <time dateTime={message.createdAt}>{formatMessageTimestamp(message.createdAt)}</time>
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
                <button className="button-link button-link-secondary" type="button" onClick={onScrollToBottom}>
                  Voir les nouveaux messages
                </button>
              </div>
            ) : null}

            <form className="messaging-composer" onSubmit={onSendMessage} ref={composerFormRef}>
              <textarea
                className="messaging-composer-input"
                rows={1}
                value={messageInput}
                onChange={(event) => onMessageInputChange(event.target.value)}
                onKeyDown={onComposerKeyDown}
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
