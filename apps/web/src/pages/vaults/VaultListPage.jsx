import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { fetchVaults } from '../../services/api/vaultApi.js'

export function VaultListPage({ navigate }) {
  const { token } = useAuth()
  const [vaults, setVaults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    // Recharge les trousseaux dès que la recherche change.
    async function loadVaults() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const responseData = await fetchVaults(token, searchQuery)

        if (!isCancelled) {
          setVaults(responseData.vaults)
          setFeedbackMessage(searchQuery.trim() !== '' ? 'Recherche mise à jour.' : '')
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.responseData?.message ?? 'Impossible de charger les trousseaux.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadVaults()

    return () => {
      isCancelled = true
    }
  }, [searchQuery, token])

  const vaultCountLabel = useMemo(() => {
    if (vaults.length <= 1) {
      return `${vaults.length} trousseau`
    }

    return `${vaults.length} trousseaux`
  }, [vaults.length])

  return (
    <section className="dashboard-shell vault-shell">
      <article className="auth-card vault-card">
        <div className="vault-header-row">
          <div>
            <p className="eyebrow">Trousseaux</p>
            <h1 className="dashboard-title vault-title">Retrouver vos trousseaux ici.</h1>
            <p className="lede">Parcourez vos trousseaux, retrouvez-les rapidement par nom et ouvrez celui qu'il vous faut sans détour.</p>
          </div>
          <button className="button-link button-link-primary vault-create-button" onClick={() => navigate('/vaults/nouveau')} type="button">
            Créer un trousseau
          </button>
        </div>

        <div className="vault-toolbar vault-toolbar-surface">
          <label className="field vault-search-field">
            <span>Recherche</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un trousseau"
              type="search"
              value={searchQuery}
            />
          </label>

          <div aria-live="polite" className="vault-toolbar-meta">
            <span className="badge badge-info">{vaultCountLabel}</span>
            <p>{searchQuery.trim() !== '' ? 'Résultats filtrés sur votre recherche.' : 'Vos trousseaux récents restent visibles en premier.'}</p>
          </div>
        </div>

        {feedbackMessage ? <p className="field-feedback field-feedback-success">{feedbackMessage}</p> : null}
        {errorMessage ? <p className="field-feedback field-feedback-error">{errorMessage}</p> : null}
        {isLoading ? <p className="field-help">Chargement des trousseaux...</p> : null}

        {!isLoading && vaults.length === 0 ? (
          <section className="status-card vault-empty-state">
            <h2>Aucun trousseau pour le moment</h2>
            <p>Créez votre premier trousseau pour commencer à organiser vos accès.</p>
          </section>
        ) : null}

        {vaults.length > 0 ? (
          <div className="vault-list" role="list">
            {vaults.map((vault) => (
              <article className="status-card vault-list-item" key={vault.id} role="listitem">
                <div className="vault-list-main">
                  <div className="vault-list-copy">
                    <div className="vault-list-heading">
                      <h2>{vault.name}</h2>
                      <span className="vault-member-count">{vault.memberCount} membre{vault.memberCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="vault-list-footer">
                  <div className="vault-inline-meta">
                    <span className="vault-meta-label">Propriétaire</span>
                    <strong>{vault.owner.displayName}</strong>
                  </div>
                  <div className="vault-inline-meta">
                    <span className="vault-meta-label">Votre rôle</span>
                    <strong>{formatRole(vault.access?.role)}</strong>
                  </div>
                  <button className="button-link button-link-ghost vault-list-action" onClick={() => navigate(`/vaults/${vault.id}`)} type="button">
                    Ouvrir
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  )
}

function formatRole(role) {
  switch (role) {
    case 'OWNER':
      return 'Propriétaire'
    case 'EDITOR':
      return 'Éditeur'
    case 'VIEWER':
      return 'Lecteur'
    default:
      return 'Accès non défini'
  }
}
