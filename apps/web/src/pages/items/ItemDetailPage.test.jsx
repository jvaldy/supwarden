import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ItemDetailPage } from './ItemDetailPage.jsx'

const {
  requestPinMock,
  clearUnlockMock,
  storeItemEditUnlockMock,
} = vi.hoisted(() => ({
  requestPinMock: vi.fn(),
  clearUnlockMock: vi.fn(),
  storeItemEditUnlockMock: vi.fn(),
}))

vi.mock('../../context/authContext.js', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

vi.mock('../../hooks/useSecretUnlockSession.js', () => ({
  useSecretUnlockSession: () => ({
    clearUnlock: clearUnlockMock,
    isUnlocked: false,
    requestPin: requestPinMock,
  }),
}))

vi.mock('../../services/storage/itemEditUnlockStorage.js', () => ({
  storeItemEditUnlock: storeItemEditUnlockMock,
}))

vi.mock('../../services/api/itemApi.js', () => ({
  deleteVaultItem: vi.fn(),
  downloadVaultItemAttachment: vi.fn(),
  fetchVaultItem: vi.fn(),
  unlockVaultItemSecret: vi.fn(),
}))

const { fetchVaultItem, unlockVaultItemSecret } = await import('../../services/api/itemApi.js')

describe('ItemDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('demande le PIN avant d’entrer en modification pour un item sensible', async () => {
    requestPinMock.mockResolvedValueOnce('1234')
    unlockVaultItemSecret.mockResolvedValueOnce({ secret: 'super-secret' })
    fetchVaultItem.mockResolvedValueOnce({
      item: {
        id: 12,
        name: 'Twitch',
        username: '2aCrazy',
        secret: null,
        hasSecret: true,
        isSensitive: true,
        notes: 'Compte streaming',
        createdAt: '2026-04-01T12:00:00+00:00',
        updatedAt: '2026-04-01T12:30:00+00:00',
        uris: [],
        customFields: [],
        attachments: [],
        itemPermissions: [],
        access: { canEdit: true, canDelete: false, canManageAttachments: false },
        type: 'LOGIN',
      },
    })

    const navigate = vi.fn()
    render(<ItemDetailPage itemId={12} navigate={navigate} vaultId={5} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Modifier' }))

    await waitFor(() => {
      expect(requestPinMock).toHaveBeenCalledWith('Saisissez votre code PIN pour déverrouiller cet élément.')
    })
    expect(unlockVaultItemSecret).toHaveBeenCalledWith('test-token', 12, '1234')
    expect(storeItemEditUnlockMock).toHaveBeenCalledWith(12, 'super-secret')
    expect(navigate).toHaveBeenCalledWith('/vaults/5/items/12/modifier')
  })

  test('entre en modification sans PIN pour un item standard', async () => {
    fetchVaultItem.mockResolvedValueOnce({
      item: {
        id: 15,
        name: 'Facebook',
        username: 'john',
        secret: 'visible-secret',
        hasSecret: true,
        isSensitive: false,
        notes: '',
        createdAt: '2026-04-01T12:00:00+00:00',
        updatedAt: '2026-04-01T12:30:00+00:00',
        uris: [],
        customFields: [],
        attachments: [],
        itemPermissions: [],
        access: { canEdit: true, canDelete: false, canManageAttachments: false },
        type: 'LOGIN',
      },
    })

    const navigate = vi.fn()
    render(<ItemDetailPage itemId={15} navigate={navigate} vaultId={5} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Modifier' }))

    expect(requestPinMock).not.toHaveBeenCalled()
    expect(unlockVaultItemSecret).not.toHaveBeenCalled()
    expect(storeItemEditUnlockMock).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/vaults/5/items/15/modifier')
  })
})
