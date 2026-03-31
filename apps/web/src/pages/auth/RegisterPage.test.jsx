import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext } from '../../context/authContext.js'
import * as authApi from '../../services/api/authApi.js'
import { RegisterPage } from './RegisterPage.jsx'

function renderRegisterPage(overrides = {}) {
  const navigate = vi.fn()
  const registerUser = vi.fn()

  render(
    <AuthContext.Provider value={{ register: registerUser, ...overrides }}>
      <RegisterPage navigate={navigate} />
    </AuthContext.Provider>,
  )

  return {
    navigate,
    registerUser,
  }
}

describe('RegisterPage', () => {
  test('redirige vers Google OAuth quand le bouton dédié est utilisé', () => {
    // La finalisation du flux OAuth est couverte dans l'écran de callback.
    const redirectToGoogleOAuthMock = vi.spyOn(authApi, 'redirectToGoogleOAuth').mockImplementation(() => {})

    renderRegisterPage()

    fireEvent.click(screen.getByRole('button', { name: "S'inscrire avec Google" }))

    expect(redirectToGoogleOAuthMock).toHaveBeenCalled()
  })

  test('soumet les informations d’inscription et navigue vers le tableau de bord', async () => {
    const { registerUser, navigate } = renderRegisterPage()
    registerUser.mockResolvedValue({
      token: 'token',
      user: { email: 'camille@example.com' },
    })

    fireEvent.change(screen.getByLabelText('Prénom'), {
      target: { value: 'Camille' },
    })
    fireEvent.change(screen.getByLabelText('Nom'), {
      target: { value: 'Durand' },
    })
    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'camille@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'motdepasse123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'motdepasse123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        email: 'camille@example.com',
        firstname: 'Camille',
        lastname: 'Durand',
        password: 'motdepasse123',
      })
    })

    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  test('bloque l’envoi si la confirmation du mot de passe ne correspond pas', async () => {
    const { registerUser } = renderRegisterPage()

    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'motdepasse123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'different' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(registerUser).not.toHaveBeenCalled()
    expect(await screen.findByText('Les mots de passe doivent être identiques.')).toBeInTheDocument()
  })
})
