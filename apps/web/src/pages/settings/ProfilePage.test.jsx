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
      hasLocalPassword: true,
      hasPin: false,
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
          hasLocalPassword: true,
          hasPin: false,
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
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes informations' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        firstname: 'Alicia',
        lastname: 'Bernard',
      })
    })

    expect(await screen.findByText('Vos informations ont bien été mises à jour.')).toBeInTheDocument()
  })

  test('modifie le mot de passe avec le mot de passe actuel', async () => {
    const { updateProfile } = renderProfilePage()

    // Le profil et la suppression partagent le même libellé dans cette page.
    fireEvent.change(screen.getAllByLabelText('Mot de passe actuel')[0], {
      target: { value: 'motdepasse123' },
    })
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'motdepasse12345' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), {
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

  test('définit un code PIN sans demander l’ancien si aucun PIN n’existe encore', async () => {
    const { updateProfile } = renderProfilePage()

    expect(screen.queryByLabelText('Code PIN actuel')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nouveau code PIN'), {
      target: { value: '1234' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau code PIN'), {
      target: { value: '1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Définir un code PIN' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        newPin: '1234',
      })
    })

    expect(await screen.findByText('Votre code PIN a bien été défini.')).toBeInTheDocument()
  })

  test('modifie le code PIN sans demander l’ancien PIN', async () => {
    const { updateProfile } = renderProfilePage({
      authenticatedUser: {
        email: 'camille@example.com',
        firstname: 'Camille',
        lastname: 'Martin',
        isActive: true,
        hasLocalPassword: true,
        hasPin: true,
      },
    })

    fireEvent.change(screen.getByLabelText('Nouveau code PIN'), {
      target: { value: '4826' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau code PIN'), {
      target: { value: '4826' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Modifier mon code PIN' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        newPin: '4826',
      })
    })

    expect(await screen.findByText('Votre code PIN a bien été modifié.')).toBeInTheDocument()
  })

  test('bloque la modification du PIN si la confirmation ne correspond pas', async () => {
    const { updateProfile } = renderProfilePage()

    fireEvent.change(screen.getByLabelText('Nouveau code PIN'), {
      target: { value: '1234' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau code PIN'), {
      target: { value: '9999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Définir un code PIN' }))

    expect(updateProfile).not.toHaveBeenCalled()
    expect(await screen.findByText('Les codes PIN doivent être identiques.')).toBeInTheDocument()
  })

  test('propose de définir un mot de passe sans demander l’ancien pour un compte OAuth', async () => {
    const { updateProfile } = renderProfilePage({
      authenticatedUser: {
        email: 'google@example.com',
        firstname: 'Google',
        lastname: 'User',
        isActive: true,
        hasLocalPassword: false,
        hasPin: false,
      },
    })

    // Le seul champ restant avec ce libellé appartient au bloc de suppression.
    expect(screen.getAllByLabelText('Mot de passe actuel')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Définir un mot de passe' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'motdepasse12345' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), {
      target: { value: 'motdepasse12345' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Définir un mot de passe' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        newPassword: 'motdepasse12345',
      })
    })

    expect(await screen.findByText('Votre mot de passe local a bien été défini.')).toBeInTheDocument()
  })

  test('bloque la modification si la confirmation du nouveau mot de passe ne correspond pas', async () => {
    const { updateProfile } = renderProfilePage()

    // Le profil et la suppression partagent le même libellé dans cette page.
    fireEvent.change(screen.getAllByLabelText('Mot de passe actuel')[0], {
      target: { value: 'motdepasse123' },
    })
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'motdepasse12345' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), {
      target: { value: 'different' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Modifier mon mot de passe' }))

    expect(updateProfile).not.toHaveBeenCalled()
    expect(await screen.findByText('Les nouveaux mots de passe doivent être identiques.')).toBeInTheDocument()
  })

  test('supprime le compte après confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { deleteAccount, navigate } = renderProfilePage()

    // Le second champ appartient au bloc de suppression.
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
