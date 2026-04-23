import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { AuthContext } from '../context/authContext.js'
import { AppRouter } from './AppRouter.jsx'

function renderRouter(authOverrides = {}) {
  render(
    <AuthContext.Provider
      value={{
        authenticatedUser: null,
        isAuthenticated: false,
        isSessionLoading: false,
        token: null,
        logout: async () => {},
        ...authOverrides,
      }}
    >
      <AppRouter />
    </AuthContext.Provider>,
  )
}

describe('AppRouter', () => {
  const initialPath = window.location.pathname

  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    window.history.pushState({}, '', initialPath)
  })

  test('redirige vers la connexion quand un visiteur tente d’ouvrir le tableau de bord', async () => {
    window.history.pushState({}, '', '/dashboard')

    // La garde d'accès doit corriger l'URL sans interaction utilisateur.
    renderRouter()

    expect(await screen.findByRole('heading', { name: /vos trousseaux en quelq/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/connexion')
    })
  })

  test('redirige vers le tableau de bord quand un utilisateur connecté ouvre la connexion', async () => {
    window.history.pushState({}, '', '/connexion')

    // Une session déjà restaurée ne doit pas laisser l'utilisateur sur la page publique.
    renderRouter({
      authenticatedUser: {
        email: 'camille@example.com',
        firstname: 'Camille',
        lastname: 'Durand',
        isActive: true,
        createdAt: '2026-03-28T10:00:00+00:00',
        roles: ['ROLE_USER'],
      },
      isAuthenticated: true,
      token: 'token',
    })

    expect(await screen.findByText('Bienvenue dans votre espace Supwarden.')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })
})
