import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { VaultListPage } from './VaultListPage.jsx'

vi.mock('../../context/authContext.js', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

vi.mock('../../services/api/vaultApi.js', () => ({
  fetchVaults: vi.fn(),
}))

const { fetchVaults } = await import('../../services/api/vaultApi.js')

describe('VaultListPage', () => {
  test('affiche un état vide si aucun trousseau n’est disponible', async () => {
    fetchVaults.mockResolvedValueOnce({ vaults: [] })
    const navigate = vi.fn()

    render(<VaultListPage navigate={navigate} />)

    expect(await screen.findByText('Aucun trousseau pour le moment')).toBeInTheDocument()
  })

  test('ouvre la création depuis le bouton principal', async () => {
    fetchVaults.mockResolvedValueOnce({ vaults: [] })
    const navigate = vi.fn()

    render(<VaultListPage navigate={navigate} />)

    await screen.findByText('Aucun trousseau pour le moment')
    fireEvent.click(screen.getByRole('button', { name: 'Créer un trousseau' }))

    expect(navigate).toHaveBeenCalledWith('/vaults/nouveau')
  })

  test('ouvre le détail d’un trousseau affiché dans la liste', async () => {
    fetchVaults.mockResolvedValueOnce({
      vaults: [
        {
          id: 5,
          name: 'Streaming',
          memberCount: 2,
          owner: { displayName: 'John Valdy Boungou' },
          access: { role: 'OWNER' },
        },
      ],
    })
    const navigate = vi.fn()

    render(<VaultListPage navigate={navigate} />)

    await screen.findByText('Streaming')
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    expect(navigate).toHaveBeenCalledWith('/vaults/5')
  })

  test('relance la recherche et affiche le message de filtre', async () => {
    fetchVaults.mockResolvedValueOnce({ vaults: [] }).mockResolvedValueOnce({
      vaults: [
        {
          id: 12,
          name: 'Streaming',
          memberCount: 2,
          owner: { displayName: 'John Valdy Boungou' },
          access: { role: 'OWNER' },
        },
      ],
    })
    const navigate = vi.fn()

    render(<VaultListPage navigate={navigate} />)

    await screen.findByText('Aucun trousseau pour le moment')
    fireEvent.change(screen.getByPlaceholderText('Rechercher un trousseau'), {
      target: { value: 'Stream' },
    })

    await waitFor(() => {
      expect(fetchVaults).toHaveBeenLastCalledWith('test-token', 'Stream')
    })

    expect(await screen.findByText('Recherche mise à jour.')).toBeInTheDocument()
    expect(screen.getByText('Résultats filtrés sur votre recherche.')).toBeInTheDocument()
  })
})
