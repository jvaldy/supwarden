import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { VaultDetailPage } from './VaultDetailPage.jsx'

vi.mock('../../context/authContext.js', () => ({
  useAuth: () => ({
    authenticatedUser: { id: 1 },
    token: 'test-token',
  }),
}))

vi.mock('../../services/api/vaultApi.js', () => ({
  fetchVault: vi.fn(),
  addVaultMember: vi.fn(),
  deleteVault: vi.fn(),
  deleteVaultMember: vi.fn(),
  updateVault: vi.fn(),
  updateVaultMember: vi.fn(),
}))

const { fetchVault, addVaultMember, updateVault } = await import('../../services/api/vaultApi.js')

describe('VaultDetailPage', () => {
  test('ouvre un modal membres pour le propriétaire même sur un trousseau personnel', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 1,
        name: 'Streaming',
        type: 'PERSONAL',
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
        },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={1} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Membres' }))

    expect(screen.getByText('Gérer les membres du trousseau')).toBeInTheDocument()
    expect(screen.getByText('Invitez un premier membre pour partager ce trousseau. Il deviendra automatiquement partagé.')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument()
  })

  test('laisse un membre simple consulter la liste sans afficher les actions de gestion', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 2,
        name: 'Projet famille',
        type: 'SHARED',
        owner: { id: 3, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 22,
            role: 'OWNER',
            createdAt: null,
            user: { id: 3, displayName: 'John Valdy Boungou' },
          },
          {
            id: 23,
            role: 'VIEWER',
            createdAt: null,
            user: { id: 1, displayName: 'Elsie LIKWELA ZOLANA' },
          },
        ],
        access: {
          role: 'VIEWER',
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
        },
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
        type: 'PERSONAL',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 70,
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
        },
      },
    })

    updateVault.mockResolvedValueOnce({
      vault: {
        id: 7,
        name: 'Streaming famille',
        description: 'Accès vidéo du foyer',
        type: 'PERSONAL',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 70,
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
        },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={7} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }))

    fireEvent.change(screen.getByLabelText('Nom du trousseau'), {
      target: { value: 'Streaming famille' },
    })
    fireEvent.change(screen.getByLabelText('Description du trousseau'), {
      target: { value: 'Accès vidéo du foyer' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(updateVault).toHaveBeenCalledWith('test-token', 7, {
      name: 'Streaming famille',
      description: 'Accès vidéo du foyer',
    })
    expect(await screen.findByText('Les paramètres du trousseau ont bien été mis à jour.')).toBeInTheDocument()
  })

  test('cache la suppression du trousseau pour un membre sans droit de suppression', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 8,
        name: 'Projet partagé',
        description: 'Accès communs',
        type: 'SHARED',
        owner: { id: 3, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 80,
            role: 'OWNER',
            createdAt: null,
            user: { id: 3, displayName: 'John Valdy Boungou' },
          },
          {
            id: 81,
            role: 'EDITOR',
            createdAt: null,
            user: { id: 1, displayName: 'Elsie LIKWELA ZOLANA' },
          },
        ],
        access: {
          role: 'EDITOR',
          canEdit: true,
          canDelete: false,
          canManageMembers: false,
        },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={8} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }))

    expect(screen.queryByRole('button', { name: 'Supprimer le trousseau' })).not.toBeInTheDocument()
  })

  test('affiche une erreur de validation si l’adresse e-mail du membre est vide', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 9,
        name: 'Streaming',
        type: 'PERSONAL',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 90,
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
        },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={9} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Membres' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un membre' }))

    expect(screen.getByText('Renseignez une adresse e-mail avant d’ajouter un membre.')).toBeInTheDocument()
  })

  test('affiche le message de succès après ajout d’un membre', async () => {
    fetchVault.mockResolvedValueOnce({
      vault: {
        id: 10,
        name: 'Streaming',
        type: 'PERSONAL',
        owner: { id: 1, displayName: 'John Valdy Boungou' },
        members: [
          {
            id: 100,
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
        },
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
          {
            id: 100,
            role: 'OWNER',
            createdAt: null,
            user: { id: 1, displayName: 'John Valdy Boungou' },
          },
          {
            id: 101,
            role: 'VIEWER',
            createdAt: null,
            user: { id: 2, displayName: 'Elsie LIKWELA ZOLANA' },
          },
        ],
        access: {
          role: 'OWNER',
          canEdit: true,
          canDelete: true,
          canManageMembers: true,
        },
      },
    })

    render(<VaultDetailPage navigate={vi.fn()} vaultId={10} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Membres' }))
    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'elsie@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un membre' }))

    await waitFor(() => {
      expect(addVaultMember).toHaveBeenCalledWith('test-token', 10, {
        email: 'elsie@example.com',
        role: 'VIEWER',
      })
    })

    expect(await screen.findByText('Invitation enregistrée. Le membre apparaît maintenant dans la liste.')).toBeInTheDocument()
  })
})
