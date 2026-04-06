import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ItemFormPage } from './ItemFormPage.jsx'

vi.mock('../../context/authContext.js', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

vi.mock('../../services/api/itemApi.js', () => ({
  createVaultItem: vi.fn(),
  deleteVaultItemAttachment: vi.fn(),
  downloadVaultItemAttachment: vi.fn(),
  fetchVaultItem: vi.fn(),
  updateVaultItem: vi.fn(),
  uploadVaultItemAttachment: vi.fn(),
}))

vi.mock('../../services/storage/itemEditUnlockStorage.js', () => ({
  takeItemEditUnlock: vi.fn(),
}))

const {
  createVaultItem,
  fetchVaultItem,
  updateVaultItem,
} = await import('../../services/api/itemApi.js')
const { takeItemEditUnlock } = await import('../../services/storage/itemEditUnlockStorage.js')

describe('ItemFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    takeItemEditUnlock.mockReturnValue('')
  })

  test('crée un item puis revient au trousseau', async () => {
    createVaultItem.mockResolvedValueOnce({ item: { id: 18 } })
    const navigate = vi.fn()

    render(<ItemFormPage itemId={null} navigate={navigate} vaultId={5} />)

    fireEvent.change(screen.getByLabelText('Nom de l’élément'), { target: { value: 'Netflix' } })
    fireEvent.change(screen.getByLabelText('Nom d’utilisateur'), { target: { value: 'camille@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'motdepasse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’élément' }))

    await waitFor(() => {
      expect(createVaultItem).toHaveBeenCalledWith(
        'test-token',
        5,
        expect.objectContaining({
          name: 'Netflix',
          username: 'camille@example.com',
          secret: 'motdepasse',
        }),
      )
    })

    expect(navigate).toHaveBeenCalledWith('/vaults/5')
  })

  test('charge un item existant et enregistre les modifications', async () => {
    fetchVaultItem.mockResolvedValueOnce({
      item: {
        id: 12,
        name: 'Netflix',
        username: 'camille@example.com',
        secret: 'motdepasse',
        notes: 'Compte principal',
        isSensitive: true,
        uris: [{ id: 1, label: 'Connexion', uri: 'https://www.netflix.com/login' }],
        customFields: [{ id: 1, label: 'Profil', type: 'text', value: 'Famille', isSensitive: false }],
        attachments: [],
        access: { canEdit: true, canManageAttachments: true },
        type: 'LOGIN',
        updatedAt: '2026-04-01T12:00:00+00:00',
      },
    })
    updateVaultItem.mockResolvedValueOnce({ item: { id: 12 } })
    const navigate = vi.fn()

    render(<ItemFormPage itemId={12} navigate={navigate} vaultId={5} />)

    expect(await screen.findByDisplayValue('Netflix')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nom de l’élément'), { target: { value: 'Netflix foyer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))

    await waitFor(() => {
      expect(updateVaultItem).toHaveBeenCalledWith(
        'test-token',
        12,
        expect.objectContaining({
          name: 'Netflix foyer',
        }),
      )
    })

    expect(navigate).toHaveBeenCalledWith('/vaults/5')
  })

  test('affiche le secret transféré sans redemander de PIN sur la page de modification', async () => {
    takeItemEditUnlock.mockReturnValueOnce('secret-deverrouille')
    fetchVaultItem.mockResolvedValueOnce({
      item: {
        id: 12,
        name: 'Twitch',
        username: '2aCrazy',
        secret: null,
        hasSecret: true,
        isSensitive: true,
        notes: 'Compte streaming',
        uris: [],
        customFields: [],
        attachments: [],
        access: { canEdit: true, canManageAttachments: true },
        type: 'LOGIN',
        updatedAt: '2026-04-01T12:00:00+00:00',
      },
    })

    render(<ItemFormPage itemId={12} navigate={vi.fn()} vaultId={5} />)

    expect(await screen.findByDisplayValue('secret-deverrouille')).toBeInTheDocument()

    const toggleButton = screen.getByRole('button', { name: 'Afficher' })
    fireEvent.click(toggleButton)

    const passwordInput = screen.getByLabelText('Mot de passe')
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(takeItemEditUnlock).toHaveBeenCalledWith(12)
  })
})
