import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { VaultDetailPage } from './VaultDetailPage.jsx'

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
  useAuth: () => ({
    authenticatedUser: { id: 1 },
    token: 'test-token',
  }),
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

vi.mock('../../services/api/vaultApi.js', () => ({
  fetchVault: vi.fn(),
  addVaultMember: vi.fn(),
  deleteVault: vi.fn(),
  deleteVaultMember: vi.fn(),
  updateVault: vi.fn(),
  updateVaultMember: vi.fn(),
}))

vi.mock('../../services/api/itemApi.js', () => ({
  deleteVaultItem: vi.fn(),
  downloadVaultItemAttachment: vi.fn(),
  fetchVaultItem: vi.fn(),
  fetchVaultItems: vi.fn(),
  unlockVaultItemSecret: vi.fn(),
}))

const { fetchVault, addVaultMember, updateVault } = await import('../../services/api/vaultApi.js')
const { fetchVaultItem, fetchVaultItems, unlockVaultItemSecret } = await import('../../services/api/itemApi.js')

describe('VaultDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchVaultItems.mockResolvedValue({ items: [] })
  })

  test('ouvre la modale membres sur un trousseau personnel mais bloque les invitations', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 1,
        name: 'Streaming',
        type: 'PERSONAL',
        isPersonalDefault: true,
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 11,
            role: 'OWNER',
            createdAt: null,
            user: { id: 1, displayName: 'John Valdy Boungou' },
          },
        ],
        access: {
          role: 'OWNER',
          canEdit: true,
          canDelete: true,
          canManageMembers: true,
          canInviteMembers: false,
        },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Membres' }))

    expect(screen.getByText('Membres du trousseau')).toBeInTheDocument()
    expect(screen.getByText('Impossible d’inviter des membres dans le trousseau personnel.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Adresse e-mail')).not.toBeInTheDocument()
  })

  test('laisse un membre simple consulter la liste sans afficher les actions de gestion', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 2,
        name: 'Projet famille',
        type: 'SHARED',
        owner: { id: 3, displayName: 'John Valdy Boungou' },
        members: [
          { id: 22, role: 'OWNER', createdAt: null, user: { id: 3, displayName: 'John Valdy Boungou' } },
          { id: 23, role: 'VIEWER', createdAt: null, user: { id: 1, displayName: 'Elsie LIKWELA ZOLANA' } },
        ],
        access: { role: 'VIEWER', canEdit: false, canDelete: false, canManageMembers: false, canInviteMembers: false },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={2} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Membres' }))

    expect(screen.getByText('Membres du trousseau')).toBeInTheDocument()
    expect(screen.queryByText('Inviter un membre')).not.toBeInTheDocument()
    expect(screen.getByText('Elsie LIKWELA ZOLANA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitter le trousseau' })).toBeInTheDocument()
  })

  test('met à jour le nom et la description depuis la modale paramètres', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 7,
        name: 'Streaming',
        description: 'Accès vidéo',
        type: 'SHARED',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [{ id: 70, role: 'OWNER', createdAt: null, user: { id: 1, displayName: 'John Valdy Boungou' } }],
        access: { role: 'OWNER', canEdit: true, canDelete: true, canManageMembers: true, canInviteMembers: true },
      },
    })

    updateVault.mockResolvedValueOnce({
      vault: {
        id: 7,
        name: 'Streaming famille',
        description: 'Accès vidéo du foyer',
        type: 'SHARED',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [{ id: 70, role: 'OWNER', createdAt: null, user: { id: 1, displayName: 'John Valdy Boungou' } }],
        access: { role: 'OWNER', canEdit: true, canDelete: true, canManageMembers: true, canInviteMembers: true },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={7} />)
    fireEvent.click(await screen.findByRole('button', { name: /Paramètres/i }))
    fireEvent.change(screen.getByLabelText('Nom du trousseau'), { target: { value: 'Streaming famille' } })
    fireEvent.change(screen.getByLabelText('Description du trousseau'), { target: { value: 'Accès vidéo du foyer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(updateVault).toHaveBeenCalledWith('test-token', 7, {
      name: 'Streaming famille',
      description: 'Accès vidéo du foyer',
    })
    expect(await screen.findByText(/Les paramètres du trousseau ont bien été mis à jour\./)).toBeInTheDocument()
  })

  test('affiche le message de succès après ajout d’un membre', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 10,
        name: 'Streaming',
        type: 'SHARED',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [{ id: 100, role: 'OWNER', createdAt: null, user: { id: 1, displayName: 'John Valdy Boungou' } }],
        access: { role: 'OWNER', canEdit: true, canDelete: true, canManageMembers: true, canInviteMembers: true },
      },
    })

    addVaultMember.mockResolvedValueOnce({
      member: {
        id: 101,
        role: 'VIEWER',
        createdAt: null,
        user: { id: 2, displayName: 'Elsie LIKWELA ZOLANA' },
      },
      vaultType: 'SHARED',
    })

    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 10,
        name: 'Streaming',
        type: 'SHARED',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [
          { id: 100, role: 'OWNER', createdAt: null, user: { id: 1, displayName: 'John Valdy Boungou' } },
          { id: 101, role: 'VIEWER', createdAt: null, user: { id: 2, displayName: 'Elsie LIKWELA ZOLANA' } },
        ],
        access: { role: 'OWNER', canEdit: true, canDelete: true, canManageMembers: true, canInviteMembers: true },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={10} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Membres' }))
    fireEvent.change(screen.getByLabelText('Adresse e-mail'), { target: { value: 'elsie@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un membre' }))

    await waitFor(() => {
      expect(addVaultMember).toHaveBeenCalledWith('test-token', 10, {
        email: 'elsie@example.com',
        role: 'VIEWER',
      })
    })

    expect(await screen.findByText(/Invitation enregistrée\. Le membre apparaît maintenant dans la liste\./)).toBeInTheDocument()
  })

  test('demande une preuve sensible avant de modifier un élément sensible depuis le modal', async () => {
    requestSecretCredentialMock.mockResolvedValueOnce({ method: 'pin', value: '1234' })
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 11,
        name: 'Streaming',
        description: '',
        type: 'SHARED',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [{ id: 110, role: 'OWNER', createdAt: null, user: { id: 1, displayName: 'John Valdy Boungou' } }],
        access: { role: 'OWNER', canEdit: true, canDelete: true, canManageMembers: true, canInviteMembers: true },
      },
    })
    fetchVaultItems.mockResolvedValueOnce({
      items: [{ id: 71, name: 'Twitch', username: '2aCrazy', hasSecret: true, isSensitive: true, uris: [] }],
    })
    fetchVaultItem.mockResolvedValueOnce({
      item: {
        id: 71,
        name: 'Twitch',
        username: '2aCrazy',
        hasSecret: true,
        isSensitive: true,
        secret: null,
        notes: '',
        type: 'LOGIN',
        createdAt: '2026-04-01T12:00:00+00:00',
        updatedAt: '2026-04-01T12:10:00+00:00',
        uris: [],
        customFields: [],
        attachments: [],
        access: { canEdit: true, canDelete: false },
      },
    })
    unlockVaultItemSecret.mockResolvedValueOnce({ secret: 'secret-twitch' })

    const navigate = vi.fn()
    render(<VaultDetailPage navigate={navigate} vaultId={11} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Plus' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier' }))

    await waitFor(() => {
      expect(requestSecretCredentialMock).toHaveBeenCalled()
    })
    expect(requestSecretCredentialMock.mock.calls[0][0]).toMatch(/mot de passe/i)
    expect(requestSecretCredentialMock.mock.calls[0][1]).toEqual({ allowPin: false })
    expect(unlockVaultItemSecret).toHaveBeenCalledWith('test-token', 71, { method: 'pin', value: '1234' })
    expect(storeItemEditUnlockMock).toHaveBeenCalledWith(71, 'secret-twitch')
    expect(navigate).toHaveBeenCalledWith('/vaults/11/items/71/modifier')
  })
})

