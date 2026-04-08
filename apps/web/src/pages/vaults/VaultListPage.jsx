import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { exportDataFile, exportVaultDataFile, importDataFile } from '../../services/api/advancedApi.js'
import { verifyUserPin } from '../../services/api/authApi.js'
import { useSecretUnlockSession } from '../../hooks/useSecretUnlockSession.js'
import { fetchVaults } from '../../services/api/vaultApi.js'

export function VaultListPage({ navigate }) {
  const { token } = useAuth()
  const { clearUnlock, requestPin } = useSecretUnlockSession()
  const [vaults, setVaults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [importFormat, setImportFormat] = useState('json')
  const [importFile, setImportFile] = useState(null)
  const [importMessage, setImportMessage] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    let isCancelled = false

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
    if (vaults.length <= 1) return `${vaults.length} trousseau`
    return `${vaults.length} trousseaux`
  }, [vaults.length])

  async function requirePinForDataTransfer() {
    const pin = await requestPin('Saisissez votre code PIN pour continuer.', { forcePrompt: true })
    if (pin === null) return false

    try {
      await verifyUserPin(token, pin)
      return true
    } catch (error) {
      clearUnlock()
      const message = error.responseData?.message ?? 'Le code PIN est incorrect.'
      setImportErrors([message])
      setErrorMessage(message)
      return false
    }
  }

  async function handleExportVault(vaultId) {
    const canContinue = await requirePinForDataTransfer()
    if (!canContinue) return

    try {
      const currentVault = vaults.find((vault) => vault.id === vaultId)
      await exportVaultDataFile(token, vaultId, 'json', currentVault?.name ?? '')
      setFeedbackMessage('Export du trousseau téléchargé.')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message ?? 'Impossible d’exporter ce trousseau.')
    }
  }

  async function handleImport(event) {
    event.preventDefault()
    if (!importFile) {
      setImportErrors(['Sélectionnez un fichier avant de lancer l’import.'])
      return
    }

    const canContinue = await requirePinForDataTransfer()
    if (!canContinue) return

    setIsImporting(true)
    setImportMessage('')
    setImportErrors([])

    try {
      const responseData = await importDataFile(token, importFile, importFormat)
      const report = responseData.report ?? {}
      const nextErrors = Array.isArray(report.errors) ? report.errors : []
      setImportErrors(nextErrors)
      setImportMessage(`Import terminé: ${report.createdVaults ?? 0} trousseau(x), ${report.createdItems ?? 0} élément(s) créé(s).`)
    } catch (error) {
      setImportErrors([error.responseData?.message ?? 'Import impossible pour le moment.'])
    } finally {
      setIsImporting(false)
    }
  }

  async function handleExportAll(format) {
    const canContinue = await requirePinForDataTransfer()
    if (!canContinue) return

    setIsExporting(true)

    try {
      await exportDataFile(token, format)
      setImportMessage(`Export ${format.toUpperCase()} téléchargé.`)
      setImportErrors([])
    } catch (error) {
      setImportErrors([error.message ?? 'Export impossible pour le moment.'])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <section className="dashboard-shell vault-shell">
        <article className="auth-card vault-card">
          <div className="vault-header-row vault-list-header-row">
            <div>
              <p className="eyebrow">Trousseaux</p>
              <h1 className="dashboard-title vault-title">Retrouver vos trousseaux ici.</h1>
              <p className="lede">Parcourez vos trousseaux, retrouvez-les rapidement par nom et ouvrez celui qu'il vous faut sans détour.</p>
            </div>
            <button className="button-link button-link-primary vault-create-button" onClick={() => navigate('/vaults/nouveau')} type="button">
              Créer un trousseau
            </button>
            <button className="button-link button-link-secondary vault-create-button" onClick={() => setIsImportExportModalOpen(true)} type="button">
              Import / Exporter tout
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
                    <div className="vault-list-heading">
                      <h2>{vault.name}</h2>
                    </div>

                    <div className="vault-list-summary" aria-label="résumé du trousseau">
                      <span className="vault-list-summary-item"><span className="vault-meta-label">Propriétaire</span><strong>{vault.owner.displayName}</strong></span>
                      <span className="vault-list-summary-separator" aria-hidden="true">•</span>
                      <span className="vault-list-summary-item"><span className="vault-meta-label">Accès</span><strong>{formatRole(vault.access?.role)}</strong></span>
                      <span className="vault-list-summary-separator" aria-hidden="true">•</span>
                      <span className="vault-list-summary-item vault-list-summary-members" aria-label={`${vault.memberCount} membre${vault.memberCount > 1 ? 's' : ''}`}><span className="vault-meta-label">Membres</span><strong>{vault.memberCount} membre{vault.memberCount > 1 ? 's' : ''}</strong></span>
                    </div>
                  </div>

                  <div className="vault-list-footer vault-list-footer-inline">
                    <button className="button-link button-link-ghost vault-list-action" onClick={() => navigate(`/vaults/${vault.id}`)} type="button">Ouvrir</button>
                    <button className="button-link button-link-secondary vault-list-action" onClick={() => handleExportVault(vault.id)} type="button">Exporter</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      {isImportExportModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsImportExportModalOpen(false)} role="presentation">
          <div className="modal-card" aria-modal="true" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <div>
                <h2>Importer / Exporter</h2>
                <p>Importez vos données JSON/CSV ou exportez l’ensemble de vos créations.</p>
              </div>
              <button className="button-link button-link-tertiary" onClick={() => setIsImportExportModalOpen(false)} type="button">Fermer</button>
            </div>

            <section className="modal-section">
              <div className="modal-section-header">
                <h3>Importer des données</h3>
              </div>
              <form className="vault-form" onSubmit={handleImport}>
                <label className="field">
                  <span>Format d’import</span>
                  <select value={importFormat} onChange={(event) => setImportFormat(event.target.value)}>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>

                <label className="field">
                  <span>Fichier</span>
                  <input accept={importFormat === 'json' ? '.json,application/json' : '.csv,text/csv'} onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} type="file" />
                </label>

                <div className="modal-actions">
                  <button className="button-link button-link-primary" disabled={isImporting} type="submit">Importer</button>
                </div>
              </form>
            </section>

            <section className="modal-section">
              <div className="modal-section-header">
                <h3>Exporter toutes les données</h3>
              </div>
              <div className="modal-actions dashboard-actions-wrap">
                <button className="button-link button-link-secondary" disabled={isExporting} onClick={() => handleExportAll('json')} type="button">Exporter JSON</button>
                <button className="button-link button-link-secondary" disabled={isExporting} onClick={() => handleExportAll('csv')} type="button">Exporter CSV</button>
              </div>
            </section>

            {importMessage ? <p className="field-feedback field-feedback-success">{importMessage}</p> : null}
            {importErrors.length > 0 ? <ul className="dashboard-error-list">{importErrors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul> : null}
          </div>
        </div>
      ) : null}
    </>
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
