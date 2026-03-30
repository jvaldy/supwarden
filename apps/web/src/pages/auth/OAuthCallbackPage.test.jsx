import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext } from '../../context/authContext.js'
import { OAuthCallbackPage } from './OAuthCallbackPage.jsx'

function setOAuthHash(hash) {
  window.history.replaceState(null, '', `/oauth/callback${hash}`)
}

describe('OAuthCallbackPage', () => {
  test('ouvre la session et redirige vers le tableau de bord quand un jeton est présent', async () => {
    const navigate = vi.fn()
    const completeOAuthSession = vi.fn()

    setOAuthHash('#token=token-google')

    render(
      <AuthContext.Provider value={{ completeOAuthSession, confirmOAuthRegistration: vi.fn() }}>
        <OAuthCallbackPage navigate={navigate} />
      </AuthContext.Provider>,
    )

    await waitFor(() => {
      expect(completeOAuthSession).toHaveBeenCalledWith('token-google')
    })

    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  test('demande une confirmation explicite avant de finaliser la première connexion Google', async () => {
    const navigate = vi.fn()
    const confirmOAuthRegistration = vi.fn().mockResolvedValue({ token: 'token', user: { email: 'camille@example.com' } })

    setOAuthHash('#status=pending&email=camille%40example.com&firstname=Camille&lastname=Durand')

    // Ce cas couvre la première connexion Google avant création du compte local.
    render(
      <AuthContext.Provider value={{ completeOAuthSession: vi.fn(), confirmOAuthRegistration }}>
        <OAuthCallbackPage navigate={navigate} />
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Confirmez l’utilisation de votre compte Google.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Autoriser et continuer' }))

    await waitFor(() => {
      expect(confirmOAuthRegistration).toHaveBeenCalled()
    })

    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })
})
