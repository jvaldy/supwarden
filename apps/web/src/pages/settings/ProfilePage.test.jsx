import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { AuthContext } from '../../context/authContext.js'
import { ProfilePage } from './ProfilePage.jsx'

function renderProfilePage(overrides = {}) {
  const navigate = vi.fn()
  const updateProfile = vi.fn().mockResolvedValue({
    user: {
      email: 'camille@example.com',
      firstname: 'Camille',
      lastname: 'Martin',
    },
  })
  const deleteAccount = vi.fn().mockResolvedValue({
    message: 'Votre compte a bien été supprimé.',
  })

  render(
    <AuthContext.Provider
      value={{
        authenticatedUser: {
          email: 'camille@example.com',
          firstname: 'Camille',
          lastname: 'Martin',
          isActive: true,
        },
        updateProfile,
        deleteAccount,
        ...overrides,
      }}
    >
      <ProfilePage navigate={navigate} />
    </AuthContext.Provider>,
  )

  return {
    navigate,
    updateProfile,
    deleteAccount,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProfilePage', () => {
  test('met à jour les informations du profil', async () => {
    const { updateProfile } = renderProfilePage()

    fireEvent.change(screen.getByLabelText('Prénom'), {
      target: { value: 'Alicia' },
    })
    fireEvent.change(screen.getByLabelText('Nom'), {
      target: { value: 'Bernard' },
    })
    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'alicia.bernard@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes informations' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        firstname: 'Alicia',
        lastname: 'Bernard',
        email: 'alicia.bernard@example.com',
      })
    })

    expect(await screen.findByText('Vos informations ont bien été mises à jour.')).toBeInTheDocument()
  })

  test('modifie le mot de passe avec le mot de passe actuel', async () => {
    const { updateProfile } = renderProfilePage()

    fireEvent.change(screen.getAllByLabelText('Mot de passe actuel')[0], {
      target: { value: 'motdepasse123' },
    })
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'motdepasse12345' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Modifier mon mot de passe' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        currentPassword: 'motdepasse123',
        newPassword: 'motdepasse12345',
      })
    })

    expect(await screen.findByText('Votre mot de passe a bien été modifié.')).toBeInTheDocument()
  })

  test('supprime le compte après confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { deleteAccount, navigate } = renderProfilePage()

    fireEvent.change(screen.getAllByLabelText('Mot de passe actuel')[1], {
      target: { value: 'motdepasse123' },
    })
    fireEvent.click(screen.getByLabelText('Je confirme vouloir supprimer définitivement mon compte.'))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }))

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith({
        currentPassword: 'motdepasse123',
        confirmDeletion: true,
      })
    })

    expect(confirmSpy).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
