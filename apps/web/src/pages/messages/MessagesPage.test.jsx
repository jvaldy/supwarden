import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MessagesPage } from './MessagesPage.jsx'

vi.mock('../../context/authContext.js', () => ({
  useAuth: () => ({
    token: 'test-token',
  }),
}))

vi.mock('../../hooks/useMessageNotifications.js', () => ({
  useMessageNotifications: () => ({
    privateUnreadCount: 2,
    refreshNotifications: vi.fn().mockResolvedValue(null),
  }),
}))

vi.mock('../../services/api/messagingApi.js', () => ({
  fetchPrivateContacts: vi.fn(),
  fetchPrivateMessages: vi.fn(),
  sendPrivateMessage: vi.fn(),
}))

const { fetchPrivateContacts, fetchPrivateMessages, sendPrivateMessage } = await import('../../services/api/messagingApi.js')

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'setInterval').mockReturnValue(1)
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('affiche les contacts et charge une conversation', async () => {
    fetchPrivateContacts.mockResolvedValueOnce({
      contacts: [{ id: 10, displayName: 'Elsie LIKWELA ZOLANA', email: 'elsie@example.com', unreadCount: 2 }],
    })
    fetchPrivateMessages.mockResolvedValueOnce({
      messages: [
        {
          id: 1,
          content: 'Salut',
          createdAt: '2026-04-09T10:00:00+00:00',
          isRead: true,
          sender: { id: 10, displayName: 'Elsie LIKWELA ZOLANA', isCurrentUser: false },
        },
      ],
      unreadMarkedCount: 0,
    })

    render(<MessagesPage />)

    expect(await screen.findByText('Choisissez une conversation')).toBeInTheDocument()
    expect(await screen.findByText('Salut')).toBeInTheDocument()
  })

  test('envoie un message privé', async () => {
    fetchPrivateContacts.mockResolvedValueOnce({
      contacts: [{ id: 10, displayName: 'Elsie LIKWELA ZOLANA', email: 'elsie@example.com', unreadCount: 0 }],
    })
    fetchPrivateMessages.mockResolvedValueOnce({ messages: [], unreadMarkedCount: 0 })
    sendPrivateMessage.mockResolvedValueOnce({
      message: {
        id: 2,
        content: 'Bonjour',
        createdAt: '2026-04-09T10:05:00+00:00',
        isRead: false,
        sender: { id: 1, displayName: 'Vous', isCurrentUser: true },
      },
    })

    render(<MessagesPage />)

    const input = await screen.findByPlaceholderText('Écrivez votre message...')
    fireEvent.change(input, { target: { value: 'Bonjour' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => {
      expect(sendPrivateMessage).toHaveBeenCalledWith('test-token', 10, 'Bonjour')
    })
  })

  test('charge les messages précédents avec before', async () => {
    fetchPrivateContacts.mockResolvedValueOnce({
      contacts: [{ id: 10, displayName: 'Elsie LIKWELA ZOLANA', email: 'elsie@example.com', unreadCount: 0 }],
    })
    fetchPrivateMessages
      .mockResolvedValueOnce({
        messages: Array.from({ length: 80 }, (_, index) => ({
          id: index + 100,
          content: `Message ${index + 1}`,
          createdAt: `2026-04-09T10:${String(index).padStart(2, '0')}:00+00:00`,
          isRead: true,
          sender: { id: 10, displayName: 'Elsie LIKWELA ZOLANA', isCurrentUser: false },
        })),
        unreadMarkedCount: 0,
        hasMoreBefore: true,
      })
      .mockResolvedValueOnce({
        messages: [
          {
            id: 99,
            content: 'Message ancien',
            createdAt: '2026-04-09T09:00:00+00:00',
            isRead: true,
            sender: { id: 10, displayName: 'Elsie LIKWELA ZOLANA', isCurrentUser: false },
          },
        ],
        unreadMarkedCount: 0,
        hasMoreBefore: false,
      })

    render(<MessagesPage />)

    const olderButton = await screen.findByRole('button', { name: 'Charger les messages précédents' })
    fireEvent.click(olderButton)

    await waitFor(() => {
      expect(fetchPrivateMessages).toHaveBeenLastCalledWith('test-token', 10, {
        limit: 40,
        before: '2026-04-09T10:00:00+00:00',
      })
    })
  })
})
