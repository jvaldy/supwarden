import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ItemDetailPage } from './ItemDetailPage.jsx'

const {
  requestPinMock,
  requestSecretCredentialMock,
  clearUnlockMock,
  storeItemEditUnlockMock,
} = vi.hoisted(() => ({
  requestPinMock: vi.fn(),
  requestSecretCredentialMock: vi.fn(),
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
    requestSecretCredential: requestSecretCredentialMock,
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

  test('demande une preuve sensible avant d’entrer en modification pour un item sensible', async () => {
    requestSecretCredentialMock.mockResolvedValueOnce({ method: 'pin', value: '1234' })
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
      expect(requestSecretCredentialMock).toHaveBeenCalled()
    })
    expect(requestSecretCredentialMock.mock.calls[0][0]).toMatch(/mot de passe/i)
    expect(requestSecretCredentialMock.mock.calls[0][1]).toEqual({ allowPin: false })
    expect(unlockVaultItemSecret).toHaveBeenCalledWith('test-token', 12, { method: 'pin', value: '1234' })
    expect(storeItemEditUnlockMock).toHaveBeenCalledWith(12, 'super-secret')
    expect(navigate).toHaveBeenCalledWith('/vaults/5/items/12/modifier')
  })

  test('entre en modification sans preuve sensible pour un item standard', async () => {
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

    expect(requestSecretCredentialMock).not.toHaveBeenCalled()
    expect(requestPinMock).not.toHaveBeenCalled()
    expect(unlockVaultItemSecret).not.toHaveBeenCalled()
    expect(storeItemEditUnlockMock).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/vaults/5/items/15/modifier')
  })
})

