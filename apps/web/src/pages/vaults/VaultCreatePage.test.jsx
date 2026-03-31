import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import * as vaultApi from '../../services/api/vaultApi.js'
import { VaultCreatePage } from './VaultCreatePage.jsx'

vi.mock('../../context/authContext.js', () => ({
  useAuth: () => ({
    token: 'test-token',
  }),
}))

describe('VaultCreatePage', () => {
  test('ne propose plus de choix de type manuel à la création', () => {
    const navigate = vi.fn()

    render(<VaultCreatePage navigate={navigate} />)

    expect(screen.queryByLabelText('Type de trousseau')).not.toBeInTheDocument()
  })

  test('soumet uniquement le nom et la description', async () => {
    const navigate = vi.fn()
    const createVaultMock = vi.spyOn(vaultApi, 'createVault').mockResolvedValue({
      vault: { id: 9 },
    })

    render(<VaultCreatePage navigate={navigate} />)

    fireEvent.change(screen.getByLabelText('Nom du trousseau'), {
      target: { value: 'Streaming' },
    })
    fireEvent.change(screen.getByLabelText('Description du trousseau'), {
      target: { value: 'Accès partagés' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le trousseau' }))

    await waitFor(() => {
      expect(createVaultMock).toHaveBeenCalledWith('test-token', {
        name: 'Streaming',
        description: 'Accès partagés',
      })
    })

    createVaultMock.mockRestore()
  })
})
