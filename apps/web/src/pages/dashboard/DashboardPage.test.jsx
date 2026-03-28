import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext } from '../../context/authContext.js'
import { DashboardPage } from './DashboardPage.jsx'

vi.mock('../../services/authApi.js', () => ({
  fetchAdminUsers: vi.fn(),
}))

const { fetchAdminUsers } = await import('../../services/authApi.js')

function renderDashboardPage(overrides = {}) {
  render(
    <AuthContext.Provider
      value={{
        authenticatedUser: {
          email: 'camille@example.com',
          firstname: 'Camille',
          lastname: 'Martin',
          isActive: true,
          createdAt: '2026-03-28T10:00:00+00:00',
          roles: ['ROLE_USER'],
        },
        token: 'token',
        ...overrides,
      }}
    >
      <DashboardPage />
    </AuthContext.Provider>,
  )
}

describe('DashboardPage', () => {
  test('affiche les informations principales du compte connecté', async () => {
    fetchAdminUsers.mockResolvedValue({ users: [] })
    renderDashboardPage()

    expect(screen.getByText('Bienvenue dans votre espace Supwarden.')).toBeInTheDocument()
    expect(screen.getByText('camille@example.com')).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
  })

  test('affiche la section administrateur pour un compte admin', async () => {
    fetchAdminUsers.mockResolvedValue({
      users: [
        {
          id: 1,
          email: 'admin@example.com',
          firstname: 'Admin',
          lastname: 'Principal',
          roles: ['ROLE_ADMIN'],
          isActive: true,
        },
      ],
    })

    renderDashboardPage({
      authenticatedUser: {
        email: 'admin@example.com',
        firstname: 'Admin',
        lastname: 'Principal',
        isActive: true,
        createdAt: '2026-03-28T10:00:00+00:00',
        roles: ['ROLE_ADMIN'],
      },
    })

    expect(await screen.findByText('Espace administrateur')).toBeInTheDocument()
    expect(await screen.findByText('ROLE_ADMIN')).toBeInTheDocument()
  })
})
