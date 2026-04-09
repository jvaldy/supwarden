import { useEffect, useState } from 'react'
import { fetchAdminUsers, verifyUserPin } from '../../services/api/authApi.js'
import {
  exportDataFile,
  fetchUsageStats,
  generatePassword,
  importDataFile,
} from '../../services/api/advancedApi.js'
import { useAuth } from '../../context/authContext.js'
import { useSecretUnlockSession } from '../../hooks/useSecretUnlockSession.js'

export function DashboardPage({ navigate }) {
  const { authenticatedUser, token } = useAuth()
  const { clearUnlock, requestPin } = useSecretUnlockSession()
  const [adminUsers, setAdminUsers] = useState([])
  const [adminError, setAdminError] = useState('')
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false)

  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false)
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)

  const [passwordOptions, setPasswordOptions] = useState({
    length: 20,
    useLowercase: true,
    useUppercase: true,
    useDigits: true,
    useSymbols: true,
    exclude: '',
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [generatorMessage, setGeneratorMessage] = useState('')
  const [generatorError, setGeneratorError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const [importFormat, setImportFormat] = useState('json')
  const [importFile, setImportFile] = useState(null)
  const [importMessage, setImportMessage] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  const isAdmin = authenticatedUser?.roles?.includes('ROLE_ADMIN') ?? false

  useEffect(() => {
    let isCancelled = false

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
        if (!isCancelled) setAdminUsers(responseData.users)
      } catch (error) {
        if (!isCancelled) setAdminError(error.responseData?.message ?? 'Impossible de charger la liste des utilisateurs.')
      } finally {
        if (!isCancelled) setIsAdminUsersLoading(false)
      }
    }

    loadAdminUsers()

    return () => {
      isCancelled = true
    }
  }, [isAdmin, token])

  useEffect(() => {
    let isCancelled = false

    async function loadStats() {
      if (!token) return
      setIsStatsLoading(true)
      setStatsError('')

      try {
        const responseData = await fetchUsageStats(token)
        if (!isCancelled) setStats(responseData.stats ?? null)
      } catch (error) {
        if (!isCancelled) setStatsError(error.responseData?.message ?? 'Impossible de charger les statistiques.')
      } finally {
        if (!isCancelled) setIsStatsLoading(false)
      }
    }

    loadStats()

    return () => {
      isCancelled = true
    }
  }, [token])

  async function handleGeneratePassword(event) {
    event.preventDefault()
    setGeneratorError('')
    setGeneratorMessage('')
    setIsGenerating(true)

    try {
      const responseData = await generatePassword(token, passwordOptions)
      setGeneratedPassword(responseData.password ?? '')
      setGeneratorMessage('Mot de passe généré.')
    } catch (error) {
      setGeneratorError(error.responseData?.message ?? 'Impossible de générer un mot de passe pour le moment.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopyGeneratedPassword() {
    if (!generatedPassword) return
    try {
      await navigator.clipboard.writeText(generatedPassword)
      setGeneratorMessage('Mot de passe copié dans le presse-papiers.')
    } catch {
      setGeneratorError('Impossible de copier le mot de passe pour le moment.')
    }
  }

  async function refreshStats() {
    const responseData = await fetchUsageStats(token)
    setStats(responseData.stats ?? null)
  }

  async function requirePinForDataTransfer() {
    const pin = await requestPin('Saisissez votre code PIN pour continuer.', { forcePrompt: true })
    if (pin === null) return false

    try {
      await verifyUserPin(token, pin)
      return true
    } catch (error) {
      clearUnlock()
      setImportErrors([error.responseData?.message ?? 'Le code PIN est incorrect.'])
      return false
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
      await refreshStats()
    } catch (error) {
      setImportErrors([error.responseData?.message ?? 'Import impossible pour le moment.'])
    } finally {
      setIsImporting(false)
    }
  }

  async function handleExport(format) {
    const canContinue = await requirePinForDataTransfer()
    if (!canContinue) return

    setIsExporting(true)

    try {
      await exportDataFile(token, format)
      setImportMessage(`Export ${format.toUpperCase()} téléchargé.`)
      await refreshStats()
    } catch (error) {
      setImportErrors([error.message ?? 'Export impossible pour le moment.'])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <section className="dashboard-shell">
        <article className="auth-card dashboard-card">
          <p className="eyebrow">Tableau de bord</p>
          <h1 className="dashboard-title">Bienvenue dans votre espace Supwarden.</h1>
          <p className="lede">
            Votre session est ouverte pour{' '}
            <strong>{authenticatedUser?.firstname ? `${authenticatedUser.firstname} ${authenticatedUser.lastname ?? ''}`.trim() : authenticatedUser?.email}</strong>.
          </p>

          <section className="status-card dashboard-stats-card">
            <h2>Statistiques</h2>
            {isStatsLoading ? <p className="field-help">Chargement des statistiques...</p> : null}
            {statsError ? <p className="field-feedback field-feedback-error">{statsError}</p> : null}

            {stats ? (
              <div className="dashboard-summary dashboard-summary-compact">
                <article className="activity-item"><strong>{stats.createdVaultsCount ?? 0}</strong><span>Trousseaux créés</span></article>
                <article className="activity-item"><strong>{stats.joinedVaultsCount ?? 0}</strong><span>Trousseaux rejoints</span></article>
                <article className="activity-item"><strong>{stats.totalItemsCount ?? 0}</strong><span>Total d’éléments</span></article>
                <article className="activity-item"><strong>{stats.createdItemsCount ?? 0}</strong><span>Éléments créés</span></article>
                <article className="activity-item"><strong>{stats.sensitiveItemsCount ?? 0}</strong><span>Éléments sensibles</span></article>
                <article className="activity-item"><strong>{stats.sharedVaultsCount ?? 0}</strong><span>Trousseaux partagés</span></article>
                <article className="activity-item"><strong>{stats.invitedMembersCount ?? 0}</strong><span>Membres invités</span></article>
                <article className="activity-item"><strong>{stats.exportsCount ?? 0}</strong><span>Exports</span></article>
                <article className="activity-item"><strong>{stats.lastExportAt ? new Date(stats.lastExportAt).toLocaleString('fr-FR') : '0'}</strong><span>Dernier export</span></article>
                <article className="activity-item"><strong>{stats.importsCount ?? 0}</strong><span>Imports</span></article>
                <article className="activity-item"><strong>{stats.lastImportAt ? new Date(stats.lastImportAt).toLocaleString('fr-FR') : '0'}</strong><span>Dernier import</span></article>
              </div>
            ) : null}

            <div className="dashboard-actions-wrap dashboard-actions-below-stats">
              <button className="button-link button-link-ghost" onClick={() => navigate('/vaults')} type="button">
                Voir les trousseaux
              </button>
              <button className="button-link button-link-secondary" onClick={() => navigate('/messages')} type="button">
                Ouvrir la messagerie
              </button>
              <button className="button-link button-link-secondary" onClick={() => setIsGeneratorModalOpen(true)} type="button">
                Générer un mot de passe
              </button>
              <button className="button-link button-link-primary" onClick={() => setIsImportExportModalOpen(true)} type="button">
                Import / Exporter tout
              </button>
            </div>
          </section>

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

      {isGeneratorModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsGeneratorModalOpen(false)} role="presentation">
          <div className="modal-card" aria-modal="true" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <div>
                <h2>Générer un mot de passe</h2>
                <p>Configurez les règles puis générez un mot de passe robuste.</p>
              </div>
              <button className="button-link button-link-tertiary" onClick={() => setIsGeneratorModalOpen(false)} type="button">Fermer</button>
            </div>

            <form className="vault-form" onSubmit={handleGeneratePassword}>
              <label className="field">
                <span>Longueur</span>
                <input max="128" min="8" onChange={(event) => setPasswordOptions((current) => ({ ...current, length: Number(event.target.value) || 20 }))} type="number" value={passwordOptions.length} />
              </label>

              <label className="field">
                <span>Exclure des caractères</span>
                <input onChange={(event) => setPasswordOptions((current) => ({ ...current, exclude: event.target.value }))} placeholder="Ex: O0lI" type="text" value={passwordOptions.exclude} />
              </label>

              <div className="dashboard-options-grid">
                <label className="checkbox-option"><input checked={passwordOptions.useLowercase} onChange={(event) => setPasswordOptions((current) => ({ ...current, useLowercase: event.target.checked }))} type="checkbox" /><span>Minuscules</span></label>
                <label className="checkbox-option"><input checked={passwordOptions.useUppercase} onChange={(event) => setPasswordOptions((current) => ({ ...current, useUppercase: event.target.checked }))} type="checkbox" /><span>Majuscules</span></label>
                <label className="checkbox-option"><input checked={passwordOptions.useDigits} onChange={(event) => setPasswordOptions((current) => ({ ...current, useDigits: event.target.checked }))} type="checkbox" /><span>Chiffres</span></label>
                <label className="checkbox-option"><input checked={passwordOptions.useSymbols} onChange={(event) => setPasswordOptions((current) => ({ ...current, useSymbols: event.target.checked }))} type="checkbox" /><span>Symboles</span></label>
              </div>

              <div className="modal-actions">
                <button className="button-link button-link-primary" disabled={isGenerating} type="submit">Générer</button>
              </div>
            </form>

            {generatedPassword ? (
              <div className="vault-item-copy-field dashboard-generated-password">
                <div className="vault-item-copy-field-body"><p>{generatedPassword}</p></div>
                <button className="button-link button-link-tertiary item-copy-button" onClick={handleCopyGeneratedPassword} title="Copier" type="button">Copier</button>
              </div>
            ) : null}

            {generatorMessage ? <p className="field-feedback field-feedback-success">{generatorMessage}</p> : null}
            {generatorError ? <p className="field-feedback field-feedback-error">{generatorError}</p> : null}
          </div>
        </div>
      ) : null}

      {isImportExportModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsImportExportModalOpen(false)} role="presentation">
          <div className="modal-card" aria-modal="true" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <div>
                <h2>Importer / Exporter</h2>
                <p>Importez vos données JSON/CSV ou exportez un snapshot complet.</p>
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
                <h3>Exporter des données</h3>
              </div>
              <p className="field-help">Téléchargez un export global de vos trousseaux et éléments.</p>
              <div className="modal-actions dashboard-actions-wrap">
                <button className="button-link button-link-secondary" disabled={isExporting} onClick={() => handleExport('json')} type="button">Exporter JSON</button>
                <button className="button-link button-link-secondary" disabled={isExporting} onClick={() => handleExport('csv')} type="button">Exporter CSV</button>
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


