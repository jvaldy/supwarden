import { useEffect, useState } from 'react'
import { fetchAdminUsers } from '../../services/api/authApi.js'
import { useAuth } from '../../context/authContext.js'

export function DashboardPage() {
  const { authenticatedUser, token } = useAuth()
  const [adminUsers, setAdminUsers] = useState([])
  const [adminError, setAdminError] = useState('')
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false)

  const isAdmin = authenticatedUser?.roles?.includes('ROLE_ADMIN') ?? false

  useEffect(() => {
    let isCancelled = false

    // Ne charge la liste admin que pour les comptes autorisés et encore actifs.
    async function loadAdminUsers() {
      if (!isAdmin || !token) {
        setAdminUsers([])
        setAdminError('')
        return
      }

      setIsAdminUsersLoading(true)
      setAdminError('')

      try {
        const responseData = await fetchAdminUsers(token)

        if (!isCancelled) {
          setAdminUsers(responseData.users)
        }
      } catch (error) {
        if (!isCancelled) {
          setAdminError(error.responseData?.message ?? 'Impossible de charger la liste des utilisateurs.')
        }
      } finally {
        if (!isCancelled) {
          setIsAdminUsersLoading(false)
        }
      }
    }

    loadAdminUsers()

    return () => {
      isCancelled = true
    }
  }, [isAdmin, token])

  return (
    <section className="dashboard-shell">
      <article className="auth-card dashboard-card">
        <p className="eyebrow">Tableau de bord</p>
        <h1 className="dashboard-title">Bienvenue dans votre espace Supwarden.</h1>
        <p className="lede">
          Votre session est ouverte pour{' '}
          <strong>{authenticatedUser?.firstname ? `${authenticatedUser.firstname} ${authenticatedUser.lastname ?? ''}`.trim() : authenticatedUser?.email}</strong>.
        </p>

        <div className="dashboard-summary">
          <article className="status-card">
            <h2>Compte connecté</h2>
            <p>{authenticatedUser?.email}</p>
          </article>
          <article className="status-card">
            <h2>Statut</h2>
            <p>{authenticatedUser?.isActive ? 'Actif' : 'Inactif'}</p>
          </article>
          <article className="status-card">
            <h2>Créé le</h2>
            <p>{formatDate(authenticatedUser?.createdAt)}</p>
          </article>
        </div>

        {isAdmin ? (
          <section className="status-card">
            <h2>Espace administrateur</h2>
            <p className="lede compact">Cette section n’est visible que pour les comptes disposant du rôle administrateur.</p>
            {isAdminUsersLoading ? <p className="field-help">Chargement des utilisateurs...</p> : null}
            {adminError ? <p className="field-feedback field-feedback-error">{adminError}</p> : null}
            {adminUsers.length > 0 ? (
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Rôles</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.firstname || user.lastname ? `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() : user.email}</td>
                        <td>{user.roles.join(', ')}</td>
                        <td>{user.isActive ? 'Actif' : 'Inactif'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}
      </article>
    </section>
  )
}

// Uniformise l'affichage des dates du tableau de bord en français.
function formatDate(dateValue) {
  if (!dateValue) {
    return 'Indisponible'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}
