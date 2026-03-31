import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext } from '../../context/authContext.js'
import * as authApi from '../../services/api/authApi.js'
import { LoginPage } from './LoginPage.jsx'

function renderLoginPage(overrides = {}) {
  const navigate = vi.fn()
  const login = vi.fn()

  render(
    <AuthContext.Provider value={{ login, ...overrides }}>
      <LoginPage navigate={navigate} />
    </AuthContext.Provider>,
  )

  return {
    navigate,
    login,
  }
}

describe('LoginPage', () => {
  test('redirige vers Google OAuth quand le bouton dédié est utilisé', () => {
    // On se limite ici au déclenchement de la redirection côté interface.
    const redirectToGoogleOAuthMock = vi.spyOn(authApi, 'redirectToGoogleOAuth').mockImplementation(() => {})

    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))

    expect(redirectToGoogleOAuthMock).toHaveBeenCalled()
  })

  test('soumet les identifiants et navigue vers le tableau de bord', async () => {
    const { login, navigate } = renderLoginPage()
    login.mockResolvedValue({ token: 'token', user: { email: 'alice@example.com' } })

    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'alice@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'motdepasse123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'motdepasse123',
      })
    })

    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  test('affiche une erreur retournée par l’API', async () => {
    const { login } = renderLoginPage()
    login.mockRejectedValue({
      responseData: {
        message: 'Identifiants invalides.',
      },
    })

    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'alice@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'mauvais' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Identifiants invalides.')).toBeInTheDocument()
  })
})
