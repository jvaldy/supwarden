import { useEffect, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import {
  createVaultItem,
  deleteVaultItemAttachment,
  downloadVaultItemAttachment,
  fetchVaultItem,
  updateVaultItem,
  uploadVaultItemAttachment,
} from '../../services/api/itemApi.js'
import { fetchVault } from '../../services/api/vaultApi.js'
import { takeItemEditUnlock } from '../../services/storage/itemEditUnlockStorage.js'

const emptyUri = { label: '', uri: '' }
const emptyField = { label: '', type: 'text', value: '', isSensitive: false }
const defaultItemPermission = { userId: 0, canView: true, canEdit: false, canManageAttachments: false, canRevealSecret: true }

export function ItemFormPage({ navigate, vaultId, itemId = null }) {
  const { token } = useAuth()
  const isEdition = itemId !== null
  const [itemMeta, setItemMeta] = useState(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [secret, setSecret] = useState('')
  const [hasSecret, setHasSecret] = useState(false)
  const [isSecretLoaded, setIsSecretLoaded] = useState(false)
  const [isSecretVisible, setIsSecretVisible] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSensitive, setIsSensitive] = useState(false)
  const [uris, setUris] = useState([{ ...emptyUri }])
  const [customFields, setCustomFields] = useState([])
  const [memberOptions, setMemberOptions] = useState([])
  const [itemPermissions, setItemPermissions] = useState([])
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(isEdition)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)

  useEffect(() => {
    if (!isEdition) {
      let isCancelled = false

      async function loadVaultContext() {
        try {
          const responseData = await fetchVault(token, vaultId)

          if (!isCancelled) {
            setMemberOptions(buildMemberOptions(responseData.vault?.members ?? []))
          }
        } catch {
          if (!isCancelled) {
            setMemberOptions([])
          }
        }
      }

      loadVaultContext()

      return () => {
        isCancelled = true
      }
    }

    let isCancelled = false

    async function loadItem() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const responseData = await fetchVaultItem(token, itemId)

        if (!isCancelled) {
          applyItemState(responseData.item)
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.responseData?.message ?? 'Impossible de charger cet élément.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadItem()

    return () => {
      isCancelled = true
    }
  }, [isEdition, itemId, token, vaultId])

  function applyItemState(item) {
    const unlockedSecret = item.id ? takeItemEditUnlock(item.id) : ''
    const nextSecret = unlockedSecret || item.secret || ''

    setItemMeta(item)
    setMemberOptions(item.memberOptions ?? [])
    setName(item.name)
    setUsername(item.username ?? '')
    setSecret(nextSecret)
    setHasSecret(Boolean(item.hasSecret || nextSecret))
    setIsSecretLoaded(Boolean(nextSecret))
    setIsSecretVisible(false)
    setNotes(item.notes ?? '')
    setIsSensitive(item.isSensitive ?? true)
    setUris(item.uris.length > 0 ? item.uris.map((uri) => ({ label: uri.label ?? '', uri: uri.uri ?? '' })) : [{ ...emptyUri }])
    setCustomFields(
      item.customFields.map((field) => ({
        label: field.label ?? '',
        type: field.type ?? 'text',
        value: field.value ?? '',
        isSensitive: Boolean(field.isSensitive),
      })),
    )
    setItemPermissions(
      (item.itemPermissions ?? []).map((permission) => ({
        userId: permission.user?.id ?? 0,
        canView: permission.canView !== false,
        canEdit: permission.canEdit === true,
        canManageAttachments: permission.canManageAttachments === true,
        canRevealSecret: permission.canRevealSecret !== false,
      })),
    )
  }

  async function reloadItem(nextFeedbackMessage = '') {
    const responseData = await fetchVaultItem(token, itemId)
    applyItemState(responseData.item)
    setFeedbackMessage(nextFeedbackMessage)
  }

  function updateUri(index, key, value) {
    setUris((currentUris) => currentUris.map((uri, currentIndex) => (currentIndex === index ? { ...uri, [key]: value } : uri)))
  }

  function updateCustomField(index, key, value) {
    setCustomFields((currentFields) => currentFields.map((field, currentIndex) => (currentIndex === index ? { ...field, [key]: value } : field)))
  }

  function addItemPermission() {
    setItemPermissions((currentPermissions) => [...currentPermissions, { ...defaultItemPermission }])
  }

  function updateItemPermission(index, key, value) {
    setItemPermissions((currentPermissions) =>
      currentPermissions.map((permission, currentIndex) => {
        if (currentIndex !== index) {
          return permission
        }

        const nextPermission = { ...permission, [key]: value }

        if (key === 'canEdit' && value) nextPermission.canView = true
        if (key === 'canManageAttachments' && value) nextPermission.canView = true
        if (key === 'canRevealSecret' && value) nextPermission.canView = true

        return nextPermission
      }),
    )
  }

  function removeItemPermission(index) {
    setItemPermissions((currentPermissions) => currentPermissions.filter((_, currentIndex) => currentIndex !== index))
  }

  function buildPayload() {
    return {
      name,
      username,
      secret,
      notes,
      isSensitive,
      uris: uris.filter((uri) => uri.label.trim() !== '' || uri.uri.trim() !== ''),
      customFields: customFields.filter((field) => field.label.trim() !== '' || field.value.trim() !== ''),
      itemPermissions: itemPermissions
        .filter((permission) => permission.userId > 0)
        .map((permission) => ({
          userId: permission.userId,
          canView: permission.canView,
          canEdit: permission.canEdit,
          canManageAttachments: permission.canManageAttachments,
          canRevealSecret: permission.canRevealSecret,
        })),
    }
  }

  async function handleSecretReveal() {
    if (!hasSecret || !isSecretLoaded) return
    if (isSecretVisible) return setIsSecretVisible(false)
    setIsSecretVisible(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedbackMessage('')
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const payload = buildPayload()
      const responseData = isEdition ? await updateVaultItem(token, itemId, payload) : await createVaultItem(token, vaultId, payload)
      setItemMeta(responseData.item)
      setFeedbackMessage(isEdition ? 'L’élément a bien été mis à jour.' : 'L’élément a bien été créé.')
      navigate(`/vaults/${vaultId}`)
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible d’enregistrer cet élément pour le moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAttachmentUpload(event) {
    const file = event.target.files?.[0]
    if (!file || !isEdition) return

    setFeedbackMessage('')
    setErrorMessage('')
    setIsUploadingAttachment(true)

    try {
      await uploadVaultItemAttachment(token, itemId, file)
      await reloadItem('La pièce jointe a bien été ajoutée.')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible d’ajouter cette pièce jointe.')
    } finally {
      setIsUploadingAttachment(false)
      event.target.value = ''
    }
  }

  async function handleAttachmentDelete(attachmentId) {
    if (!window.confirm('Confirmez-vous la suppression de cette pièce jointe ?')) return
    setFeedbackMessage('')
    setErrorMessage('')

    try {
      await deleteVaultItemAttachment(token, attachmentId)
      await reloadItem('La pièce jointe a bien été supprimée.')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de supprimer cette pièce jointe.')
    }
  }

  async function handleAttachmentDownload(attachment) {
    setErrorMessage('')
    try {
      await downloadVaultItemAttachment(token, attachment)
    } catch {
      setErrorMessage('Impossible de télécharger cette pièce jointe.')
    }
  }

  const canManageAttachments = itemMeta?.access?.canManageAttachments ?? false

  return (
    <section className="dashboard-shell item-shell">
      <article className="auth-card item-card">
        <div className="item-header-row">
          <div>
            <p className="eyebrow">{isEdition ? 'Modifier un élément' : 'Nouvel élément'}</p>
            <h1 className="dashboard-title item-title">{isEdition ? 'Mettez à jour cet élément.' : 'Ajoutez un élément au trousseau.'}</h1>
            <p className="lede">Rassemblez ici les accès utiles, les liens associés et les données complémentaires de cet élément.</p>
          </div>
          <div className="item-header-actions">
            <button className="button-link button-link-tertiary" onClick={() => navigate(`/vaults/${vaultId}`)} type="button">Retour au trousseau</button>
          </div>
        </div>

        {isLoading ? <p className="field-help">Chargement de l’élément...</p> : null}
        {errorMessage ? <p className="field-feedback field-feedback-error">{errorMessage}</p> : null}
        {feedbackMessage ? <p className="field-feedback field-feedback-success">{feedbackMessage}</p> : null}

        {!isLoading ? (
          <form className="auth-form item-form" onSubmit={handleSubmit}>
            {isEdition && itemMeta ? (
              <div className="item-meta-strip" aria-label="informations de l’élément">
                <span className="item-meta-chip"><span className="item-meta-label">Type</span><strong>{itemMeta.type === 'LOGIN' ? 'Identifiant' : itemMeta.type}</strong></span>
                <span className="item-meta-chip"><span className="item-meta-label">Mis à jour</span><strong>{formatDate(itemMeta.updatedAt)}</strong></span>
                <span className="item-meta-chip"><span className="item-meta-label">Accès</span><strong>{itemMeta.access?.canEdit ? 'Éditable' : 'Lecture seule'}</strong></span>
                <span className="item-meta-chip"><span className="item-meta-label">Sensibilité</span><strong>{itemMeta.isSensitive ? 'Sensible' : 'Standard'}</strong></span>
              </div>
            ) : null}

            <section className="item-section item-form-wide">
              <div className="item-section-header"><div><h2>Informations principales</h2></div></div>
              <label className="field item-form-wide">
                <span>Nom de l’élément</span>
                <input onChange={(event) => setName(event.target.value)} placeholder="Ex. Netflix, Facebook, Banque" type="text" value={name} />
              </label>
              <div className="item-form-grid">
                <label className="field">
                  <span>Nom d’utilisateur</span>
                  <input onChange={(event) => setUsername(event.target.value)} placeholder="Ex. camille@example.com" type="text" value={username} />
                </label>
                <label className="field">
                  <span>Mot de passe</span>
                  <div className="item-password-field">
                    <input
                      onChange={(event) => {
                        setSecret(event.target.value)
                        setIsSecretLoaded(true)
                        setIsSecretVisible(true)
                      }}
                      placeholder={hasSecret && !isSecretLoaded ? 'Mot de passe enregistré' : 'Mot de passe ou secret'}
                      type={isSecretVisible ? 'text' : 'password'}
                      value={secret}
                    />
                    {isEdition && hasSecret && isSecretLoaded ? (
                      <button className="button-link button-link-secondary item-password-reveal" onClick={handleSecretReveal} type="button">{isSecretVisible ? 'Masquer' : 'Afficher'}</button>
                    ) : null}
                  </div>
                </label>
              </div>
              <label className="field item-form-wide">
                <span>Notes</span>
                <textarea onChange={(event) => setNotes(event.target.value)} placeholder="Ajoutez un contexte utile, une consigne ou une précision." rows={4} value={notes} />
              </label>
              <label className="item-checkbox">
                <input checked={isSensitive} onChange={(event) => setIsSensitive(event.target.checked)} type="checkbox" />
                <span>Demander un code PIN avant d’afficher le secret</span>
              </label>
            </section>

            <section className="item-section item-form-wide">
              <div className="item-section-header"><div><h2>URL associées</h2></div></div>
              <div className="item-stack">
                {uris.map((uri, index) => (
                  <div className="item-inline-grid item-inline-grid-compact" key={`uri-${index}`}>
                    <label className="field"><span>Libellé</span><input onChange={(event) => updateUri(index, 'label', event.target.value)} placeholder="Ex. Connexion" type="text" value={uri.label} /></label>
                    <label className="field"><span>URL</span><input onChange={(event) => updateUri(index, 'uri', event.target.value)} placeholder="https://exemple.com" type="text" value={uri.uri} /></label>
                    {uris.length > 1 ? (
                      <button className="button-link button-link-tertiary item-remove-button" onClick={() => setUris((currentUris) => currentUris.filter((_, currentIndex) => currentIndex !== index))} type="button">Retirer</button>
                    ) : (
                      <button className="button-link button-link-secondary item-inline-add-button" onClick={() => setUris((currentUris) => [...currentUris, { ...emptyUri }])} type="button">Ajouter</button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="item-section item-form-wide">
              <div className="item-section-header"><div><h2>Champs personnalisés</h2></div></div>
              {customFields.length === 0 ? <p className="field-help">Aucun champ personnalisé pour le moment.</p> : null}
              <div className="item-stack">
                {customFields.map((field, index) => (
                  <div className="item-inline-grid item-inline-grid-fields item-inline-grid-compact" key={`field-${index}`}>
                    <label className="field"><span>Libellé</span><input onChange={(event) => updateCustomField(index, 'label', event.target.value)} placeholder="Ex. Profil" type="text" value={field.label} /></label>
                    <label className="field"><span>Type</span><select onChange={(event) => updateCustomField(index, 'type', event.target.value)} value={field.type}><option value="text">Texte</option><option value="email">E-mail</option><option value="date">Date</option></select></label>
                    <label className="field"><span>Valeur</span><input onChange={(event) => updateCustomField(index, 'value', event.target.value)} placeholder="Ex. Famille" type="text" value={field.value} /></label>
                    <label className="item-checkbox"><input checked={field.isSensitive} onChange={(event) => updateCustomField(index, 'isSensitive', event.target.checked)} type="checkbox" /><span>Sensible</span></label>
                    <button className="button-link button-link-tertiary item-remove-button" onClick={() => setCustomFields((currentFields) => currentFields.filter((_, currentIndex) => currentIndex !== index))} type="button">Retirer</button>
                  </div>
                ))}
              </div>
              <div className="item-inline-toolbar"><button className="button-link button-link-secondary" onClick={() => setCustomFields((currentFields) => [...currentFields, { ...emptyField }])} type="button">Ajouter un champ</button></div>
            </section>

            {memberOptions.length > 0 ? (
              <section className="item-section item-form-wide">
                <div className="item-section-header"><div><h2>Permissions fines</h2></div></div>
                {itemPermissions.length === 0 ? <p className="field-help">Aucune restriction par membre pour le moment.</p> : null}
                <div className="item-stack">
                  {itemPermissions.map((permission, index) => (
                    <div className="item-permission-row" key={`permission-${index}`}>
                      <label className="field">
                        <span>Membre</span>
                        <select onChange={(event) => updateItemPermission(index, 'userId', Number(event.target.value))} value={permission.userId}>
                          <option value={0}>Choisir un membre</option>
                          {memberOptions.map((member) => <option key={member.userId} value={member.userId}>{member.displayName} · {formatMemberRole(member.role)}</option>)}
                        </select>
                      </label>
                      <div className="item-permission-flags">
                        <label className="item-checkbox"><input checked={permission.canView} onChange={(event) => updateItemPermission(index, 'canView', event.target.checked)} type="checkbox" /><span>Lecture</span></label>
                        <label className="item-checkbox"><input checked={permission.canEdit} onChange={(event) => updateItemPermission(index, 'canEdit', event.target.checked)} type="checkbox" /><span>Édition</span></label>
                        <label className="item-checkbox"><input checked={permission.canManageAttachments} onChange={(event) => updateItemPermission(index, 'canManageAttachments', event.target.checked)} type="checkbox" /><span>Pièces jointes</span></label>
                        <label className="item-checkbox"><input checked={permission.canRevealSecret} onChange={(event) => updateItemPermission(index, 'canRevealSecret', event.target.checked)} type="checkbox" /><span>Secret</span></label>
                      </div>
                      <button className="button-link button-link-tertiary item-remove-button" onClick={() => removeItemPermission(index)} type="button">Retirer</button>
                    </div>
                  ))}
                </div>
                <div className="item-inline-toolbar"><button className="button-link button-link-secondary" onClick={addItemPermission} type="button">Ajouter une permission</button></div>
              </section>
            ) : null}

            {isEdition ? (
              <section className="item-section item-form-wide">
                <div className="item-section-header">
                  <div><h2>Pièces jointes</h2></div>
                  {canManageAttachments ? <label className="button-link button-link-secondary item-upload-trigger">{isUploadingAttachment ? 'Envoi...' : 'Ajouter un fichier'}<input hidden onChange={handleAttachmentUpload} type="file" /></label> : null}
                </div>
                <div className="table-card item-list-card">
                  {itemMeta?.attachments?.length === 0 ? <p className="field-help">Aucune pièce jointe.</p> : null}
                  <ul className="item-list">
                    {(itemMeta?.attachments ?? []).map((attachment) => (
                      <li className="item-list-row item-list-row-actions" key={attachment.id}>
                        <div><strong>{attachment.name}</strong><p>{formatAttachmentMeta(attachment)}</p></div>
                        <div className="item-inline-actions">
                          <button aria-label={`Télécharger ${attachment.name}`} className="button-link button-link-secondary item-icon-button" onClick={() => handleAttachmentDownload(attachment)} title="Télécharger" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></svg></button>
                          {canManageAttachments ? <button aria-label={`Supprimer ${attachment.name}`} className="button-link button-link-danger item-icon-button" onClick={() => handleAttachmentDelete(attachment.id)} title="Supprimer" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12h10l1-12" /><path d="M9 7V4h6v3" /></svg></button> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            <div className="item-form-actions item-form-wide">
              <button className="button-link button-link-primary" disabled={isSubmitting} type="submit">{isSubmitting ? 'Enregistrement...' : isEdition ? 'Enregistrer les modifications' : 'Créer l’élément'}</button>
            </div>
          </form>
        ) : null}
      </article>
    </section>
  )
}

function formatDate(value) {
  if (!value) return 'Date indisponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatAttachmentMeta(attachment) {
  const sizeInKb = Math.max(1, Math.round((attachment.size ?? 0) / 1024))
  return `${attachment.mimeType} · ${sizeInKb} Ko`
}

function buildMemberOptions(members) {
  return members.filter((member) => member?.role !== 'OWNER' && member?.user?.id).map((member) => ({ userId: member.user.id, displayName: member.user.displayName, role: member.role }))
}

function formatMemberRole(role) {
  switch (role) {
    case 'EDITOR':
      return 'Éditeur'
    case 'VIEWER':
      return 'Lecteur'
    default:
      return 'Membre'
  }
}


