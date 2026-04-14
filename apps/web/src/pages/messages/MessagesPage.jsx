import { useAuth } from '../../context/authContext.js'
import { MessagesPageLayout } from './MessagesPageLayout.jsx'
import { usePrivateMessaging } from './usePrivateMessaging.js'

export function MessagesPage() {
  const { token } = useAuth()
  const messaging = usePrivateMessaging(token)

  return (
    <MessagesPageLayout
      contacts={messaging.contacts}
      selectedContact={messaging.selectedContact}
      selectedContactId={messaging.selectedContactId}
      selectedContactIdKey={messaging.selectedContactIdKey}
      messages={messaging.messages}
      hasOlderMessages={messaging.hasOlderMessages}
      isLoadingOlderMessages={messaging.isLoadingOlderMessages}
      hasPendingMessages={messaging.hasPendingMessages}
      messageInput={messaging.messageInput}
      isLoadingContacts={messaging.isLoadingContacts}
      isLoadingMessages={messaging.isLoadingMessages}
      isSending={messaging.isSending}
      errorMessage={messaging.errorMessage}
      totalUnreadCount={messaging.totalUnreadCount}
      composerFormRef={messaging.composerFormRef}
      threadListRef={messaging.threadListRef}
      onSelectContact={messaging.setSelectedContactId}
      onMessageInputChange={messaging.setMessageInput}
      onLoadOlderMessages={messaging.handleLoadOlderMessages}
      onThreadScroll={messaging.handleThreadScroll}
      onSendMessage={messaging.handleSendMessage}
      onComposerKeyDown={messaging.handleComposerKeyDown}
      onScrollToBottom={messaging.scrollConversationToBottom}
    />
  )
}

