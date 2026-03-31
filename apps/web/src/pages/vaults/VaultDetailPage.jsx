import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import {
  addVaultMember,
  deleteVault,
  deleteVaultMember,
  fetchVault,
  updateVault,
  updateVaultMember,
} from '../../services/api/vaultApi.js'

export function VaultDetailPage({ navigate, vaultId }) {
  const { authenticatedUser, token } = useAuth()
  const [vault, setVault] = useState(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('VIEWER')
  const [settingsName, setSettingsName] = useState('')
  const [settingsDescription, setSettingsDescription] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [memberFeedbackMessage, setMemberFeedbackMessage] = useState('')
  const [memberErrorMessage, setMemberErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [isRoleInfoOpen, setIsRoleInfoOpen] = useState(false)
  const [isSettingsSubmitting, setIsSettingsSubmitting] = useState(false)

  useEffect(() => {
    let isCancelled = false

    // Recharge le détail complet du trousseau courant.
    async function loadVault() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const responseData = await fetchVault(token, vaultId)

        if (!isCancelled) {
          setVault(responseData.vault)
          setSettingsName(responseData.vault.name)
          setSettingsDescription(responseData.vault.description ?? '')
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.responseData?.message ?? 'Impossible de charger le trousseau.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadVault()

    return () => {
      isCancelled = true
    }
  }, [token, vaultId])

  async function reloadVault(nextFeedbackMessage = '') {
    const responseData = await fetchVault(token, vaultId)
    setVault(responseData.vault)
    setSettingsName(responseData.vault.name)
    setSettingsDescription(responseData.vault.description ?? '')
    setFeedbackMessage(nextFeedbackMessage)
  }

  async function handleMemberSubmit(event) {
    event.preventDefault()
    setFeedbackMessage('')
    setErrorMessage('')
    setMemberFeedbackMessage('')
    setMemberErrorMessage('')

    if (memberEmail.trim() === '') {
      setMemberErrorMessage('Renseignez une adresse e-mail avant d’ajouter un membre.')
      return
    }

    setIsSubmitting(true)

    try {
      await addVaultMember(token, vaultId, {
        email: memberEmail.trim(),
        role: memberRole,
      })

      await reloadVault('Le membre a bien été ajouté au trousseau.')
      setMemberFeedbackMessage('Invitation enregistrée. Le membre apparaît maintenant dans la liste.')
      setMemberEmail('')
      setMemberRole('VIEWER')
    } catch (error) {
      const apiErrorMessage = error.responseData?.errors?.email?.[0] ?? error.responseData?.message
      setMemberErrorMessage(apiErrorMessage ?? 'Impossible d’ajouter ce membre pour le moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMemberRoleChange(memberId, nextRole) {
    setFeedbackMessage('')
    setErrorMessage('')

    try {
      await updateVaultMember(token, vaultId, memberId, { role: nextRole })
      await reloadVault('Le rôle du membre a bien été mis à jour.')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de modifier ce rôle.')
    }
  }

  async function handleMemberDelete(memberId) {
    const userConfirmedDeletion = window.confirm('Confirmez-vous le retrait de ce membre ?')

    if (!userConfirmedDeletion) {
      return
    }

    setFeedbackMessage('')
    setErrorMessage('')

    try {
      await deleteVaultMember(token, vaultId, memberId)
      await reloadVault('Le membre a bien été retiré du trousseau.')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de retirer ce membre.')
    }
  }

  async function handleLeaveVault() {
    const currentUserMemberId = vault?.members.find((member) => member.user.id === authenticatedUser?.id)?.id

    if (!currentUserMemberId) {
      setErrorMessage('Impossible de retrouver votre adhésion à ce trousseau.')
      return
    }

    const userConfirmedLeave = window.confirm('Confirmez-vous que vous souhaitez quitter ce trousseau ?')

    if (!userConfirmedLeave) {
      return
    }

    setFeedbackMessage('')
    setErrorMessage('')

    try {
      await deleteVaultMember(token, vaultId, currentUserMemberId)
      closeMembersModal()
      navigate('/vaults')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de quitter ce trousseau pour le moment.')
    }
  }

  function openSettingsModal() {
    setSettingsName(vault?.name ?? '')
    setSettingsDescription(vault?.description ?? '')
    setIsSettingsOpen(true)
  }

  function closeSettingsModal() {
    setIsSettingsOpen(false)
  }

  function openMembersModal() {
    setIsMembersOpen(true)
    setIsRoleInfoOpen(false)
    setMemberFeedbackMessage('')
    setMemberErrorMessage('')
  }

  function closeMembersModal() {
    setIsMembersOpen(false)
    setIsRoleInfoOpen(false)
    setMemberFeedbackMessage('')
    setMemberErrorMessage('')
  }

  function toggleRoleInfo() {
    setIsRoleInfoOpen((currentValue) => !currentValue)
  }

  async function handleVaultSettingsSubmit(event) {
    event.preventDefault()
    setFeedbackMessage('')
    setErrorMessage('')
    setIsSettingsSubmitting(true)

    try {
      const responseData = await updateVault(token, vaultId, {
        name: settingsName,
        description: settingsDescription,
      })
      setVault(responseData.vault)
      setSettingsName(responseData.vault.name)
      setSettingsDescription(responseData.vault.description ?? '')
      setFeedbackMessage('Les paramètres du trousseau ont bien été mis à jour.')
      setIsSettingsOpen(false)
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de modifier ce trousseau.')
    } finally {
      setIsSettingsSubmitting(false)
    }
  }

  async function handleVaultDelete() {
    const userConfirmedDeletion = window.confirm('Confirmez-vous la suppression définitive de ce trousseau ?')

    if (!userConfirmedDeletion) {
      return
    }

    setFeedbackMessage('')
    setErrorMessage('')
    setIsSettingsSubmitting(true)

    try {
      await deleteVault(token, vaultId)
      setIsSettingsOpen(false)
      navigate('/vaults')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de supprimer ce trousseau.')
      setIsSettingsSubmitting(false)
    }
  }

  const canEditVault = vault?.access?.canEdit ?? false
  const canDeleteVault = vault?.access?.canDelete ?? false
  const canManageMembers = vault?.access?.canManageMembers ?? false
  const canViewMembers = (vault?.members?.length ?? 0) > 1 || canManageMembers || vault?.type === 'SHARED'
  const canLeaveVault = Boolean(authenticatedUser?.id) && !canManageMembers && vault?.members.some((member) => member.user.id === authenticatedUser.id)

  const membersSectionDescription = useMemo(() => {
    if (!vault) {
      return ''
    }

    if (canManageMembers && vault.type === 'PERSONAL') {
      return 'Invitez un premier membre pour partager ce trousseau. Il deviendra automatiquement partagé.'
    }

    if (canManageMembers) {
      return 'Invitez un membre et choisissez son niveau d’accès dès l’ajout.'
    }

    return 'Vous pouvez consulter les membres de ce trousseau, sans modifier leurs accès.'
  }, [canManageMembers, vault])

  return (
    <section className="dashboard-shell vault-shell">
      <article className="auth-card vault-card">
        {isLoading ? <p className="field-help">Chargement du trousseau...</p> : null}
        {errorMessage ? <p className="field-feedback field-feedback-error">{errorMessage}</p> : null}

        {vault ? (
          <>
            <div className="vault-header-row">
              <div>
                <p className="eyebrow">Détail du trousseau</p>
                <h1 className="dashboard-title vault-title">{vault.name}</h1>
                <p className="lede">
                  Type : {vault.type === 'PERSONAL' ? 'Personnel' : 'Partagé'} · Rôle : {formatRole(vault.access?.role)} · Propriétaire :{' '}
                  {vault.owner.displayName}
                </p>
              </div>
              <div className="vault-actions-row">
                {canViewMembers ? (
                  <button className="button-link button-link-ghost" onClick={openMembersModal} type="button">
                    Membres
                  </button>
                ) : null}
                {canEditVault ? (
                  <button className="button-link button-link-secondary" onClick={openSettingsModal} type="button">
                    Paramètres
                  </button>
                ) : null}
              </div>
            </div>

            {feedbackMessage ? <p className="field-feedback field-feedback-success">{feedbackMessage}</p> : null}

            <div className="dashboard-summary">
              <article className="status-card">
                <h2>Propriétaire</h2>
                <p>{vault.owner.displayName}</p>
              </article>
              <article className="status-card">
                <h2>Votre accès</h2>
                <p>{formatRole(vault.access?.role)}</p>
              </article>
              <article className="status-card">
                <h2>Nombre de membres</h2>
                <p>{vault.members.length}</p>
              </article>
            </div>

            {isSettingsOpen ? (
              <div className="modal-backdrop" role="presentation">
                <div aria-modal="true" className="modal-card" role="dialog">
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Paramètres</p>
                      <h2>Paramètres du trousseau</h2>
                    </div>
                    <button className="button-link button-link-ghost" onClick={closeSettingsModal} type="button">
                      Fermer
                    </button>
                  </div>

                  <section className="modal-section">
                    <div className="modal-section-header">
                      <h3>Modifier le trousseau</h3>
                      <p>Mettez à jour le nom et la description affichés dans votre espace.</p>
                    </div>

                    <form className="auth-form vault-form" onSubmit={handleVaultSettingsSubmit}>
                      <label className="field vault-form-wide">
                        <span>Nom du trousseau</span>
                        <input onChange={(event) => setSettingsName(event.target.value)} type="text" value={settingsName} />
                      </label>

                      <label className="field vault-form-wide">
                        <span>Description du trousseau</span>
                        <textarea
                          onChange={(event) => setSettingsDescription(event.target.value)}
                          placeholder="Décrivez brièvement ce trousseau"
                          rows={4}
                          value={settingsDescription}
                        />
                      </label>

                      <div className="modal-actions vault-form-wide">
                        <button className="button-link button-link-primary" disabled={isSettingsSubmitting} type="submit">
                          {isSettingsSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </form>
                  </section>

                  {canDeleteVault ? (
                    <section className="modal-section modal-section-danger">
                      <div className="modal-section-header">
                        <h3>Supprimer le trousseau</h3>
                        <p>Cette action est définitive. Le trousseau et son contenu associé seront supprimés.</p>
                      </div>

                      <div className="modal-actions">
                        <button className="button-link button-link-danger" disabled={isSettingsSubmitting} onClick={handleVaultDelete} type="button">
                          Supprimer le trousseau
                        </button>
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isMembersOpen ? (
              <div className="modal-backdrop" role="presentation">
                <div aria-modal="true" className="modal-card modal-card-wide" role="dialog">
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Membres</p>
                      <h2>{canManageMembers ? 'Gérer les membres du trousseau' : 'Membres du trousseau'}</h2>
                    </div>
                    <div className="modal-header-actions">
                      <div className={`vault-role-popover ${isRoleInfoOpen ? 'vault-role-popover-open' : ''}`}>
                        <button
                          aria-expanded={isRoleInfoOpen}
                          aria-label="Voir le détail des rôles"
                          className="vault-role-trigger"
                          onClick={toggleRoleInfo}
                          type="button"
                        >
                          i
                        </button>

                        <div className="vault-role-tooltip" role="note">
                          <div className="vault-role-tooltip-item">
                            <strong>Propriétaire</strong>
                            <p>Seul le propriétaire peut ajuster les rôles et retirer un membre.</p>
                          </div>
                          <div className="vault-role-tooltip-item">
                            <strong>Éditeur</strong>
                            <p>Met à jour le trousseau, sans gérer les membres.</p>
                          </div>
                          <div className="vault-role-tooltip-item">
                            <strong>Lecteur</strong>
                            <p>Consulte le trousseau en lecture seule.</p>
                          </div>
                        </div>
                      </div>

                      <button className="button-link button-link-ghost" onClick={closeMembersModal} type="button">
                        Fermer
                      </button>
                    </div>
                  </div>

                  {canManageMembers ? (
                    <section className="modal-section">
                      <div className="modal-section-header">
                        <h3>Inviter un membre</h3>
                        <p>{membersSectionDescription}</p>
                      </div>

                      <form className="auth-form vault-form" onSubmit={handleMemberSubmit}>
                        <label className="field">
                          <span>Adresse e-mail</span>
                          <input onChange={(event) => setMemberEmail(event.target.value)} type="email" value={memberEmail} />
                        </label>

                        <label className="field vault-role-field">
                          <span>Rôle</span>
                          <select className="vault-role-select" onChange={(event) => setMemberRole(event.target.value)} value={memberRole}>
                            <option value="VIEWER">Lecteur</option>
                            <option value="EDITOR">Éditeur</option>
                          </select>
                        </label>

                        {memberErrorMessage ? <p className="field-feedback field-feedback-error vault-inline-feedback vault-inline-feedback-error">{memberErrorMessage}</p> : null}
                        {memberFeedbackMessage ? <p className="field-feedback field-feedback-success vault-inline-feedback vault-inline-feedback-success">{memberFeedbackMessage}</p> : null}

                        <button className="button-link button-link-primary vault-form-wide" disabled={isSubmitting} type="submit">
                          {isSubmitting ? 'Ajout en cours...' : 'Ajouter un membre'}
                        </button>
                      </form>
                    </section>
                  ) : null}

                  <section className="modal-section">
                    <div className="modal-section-header">
                      <h3>Membres actuels</h3>
                      <p>{canManageMembers ? 'Le propriétaire garde ici la main sur les accès du trousseau.' : 'Liste des membres visible en consultation.'}</p>
                    </div>

                    {canLeaveVault ? (
                      <div className="modal-actions">
                        <button className="button-link vault-leave-button" onClick={handleLeaveVault} type="button">
                          Quitter le trousseau
                        </button>
                      </div>
                    ) : null}

                    <div className="table-card vault-table-card vault-table-scrollable">
                      <table>
                        <thead>
                          <tr>
                            <th>Membre</th>
                            <th>Rôle</th>
                            <th>Intégré le</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vault.members.map((member) => (
                            <tr key={member.id}>
                              <td>{member.user.displayName}</td>
                              <td>
                                {member.role === 'OWNER' || !canManageMembers ? (
                                  <span>{formatRole(member.role)}</span>
                                ) : (
                                  <select className="vault-role-select" onChange={(event) => handleMemberRoleChange(member.id, event.target.value)} value={member.role}>
                                    <option value="VIEWER">Lecteur</option>
                                    <option value="EDITOR">Éditeur</option>
                                  </select>
                                )}
                              </td>
                              <td>{formatMemberDate(member.createdAt)}</td>
                              <td>
                                {member.role === 'OWNER' ? (
                                  <span>Propriétaire</span>
                                ) : canManageMembers ? (
                                  <button className="button-link button-link-ghost" onClick={() => handleMemberDelete(member.id)} type="button">
                                    Retirer
                                  </button>
                                ) : member.user.id === authenticatedUser?.id ? (
                                  <span>Vous</span>
                                ) : (
                                  <span>Lecture seule</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </>
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

function formatMemberDate(createdAt) {
  if (!createdAt) {
    return 'Date indisponible'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(new Date(createdAt))
}
