import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { deleteVaultItem, downloadVaultItemAttachment, fetchVaultItem, fetchVaultItemAttachmentPreview, unlockVaultItemSecret } from '../../services/api/itemApi.js'
import { useSecretUnlockSession } from '../../hooks/useSecretUnlockSession.js'
import { storeItemEditUnlock } from '../../services/storage/itemEditUnlockStorage.js'

export function ItemDetailPage({ navigate, vaultId, itemId }) {
  const { authenticatedUser, token } = useAuth()
  const { clearUnlock, isUnlocked, requestSecretCredential, requestPin } = useSecretUnlockSession()
  const [item, setItem] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copiedFieldKey, setCopiedFieldKey] = useState('')
  const [resolvedSecret, setResolvedSecret] = useState('')
  const [isSecretVisible, setIsSecretVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [previewAttachment, setPreviewAttachment] = useState(null)

  function lockSecret() {
    setIsSecretVisible(false)
    setResolvedSecret('')
  }

  useEffect(() => {
    let isCancelled = false

    async function loadItem() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const responseData = await fetchVaultItem(token, itemId)
        if (!isCancelled) {
          setItem(responseData.item)
          lockSecret()
          clearUnlock()
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
  }, [clearUnlock, itemId, token])

  useEffect(() => {
    if (!isUnlocked) {
      lockSecret()
    }
  }, [isUnlocked])

  async function handleCopy(value, fieldKey) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedFieldKey(fieldKey)
      window.setTimeout(() => {
        setCopiedFieldKey((currentValue) => (currentValue === fieldKey ? '' : currentValue))
      }, 1400)
      window.setTimeout(() => {
      }, 1800)
    } catch {
      setErrorMessage('Impossible de copier cette information pour le moment.')
    }
  }

  async function resolveSecret() {
    if (resolvedSecret) return resolvedSecret
    if (!item?.hasSecret) return ''

    if (!item.isSensitive) {
      const nextSecret = item.secret ?? ''
      setResolvedSecret(nextSecret)
      return nextSecret
    }

    const unlockProof = await requestSensitiveUnlockProof(
      requestSecretCredential,
      requestPin,
      authenticatedUser?.hasPin === true,
      'Saisissez votre mot de passe du compte pour déverrouiller ce secret. Vous pouvez aussi utiliser votre code PIN si vous l’avez défini.',
    )
    if (unlockProof === null) return ''

    try {
      const responseData = await unlockVaultItemSecret(token, item.id, unlockProof)
      const nextSecret = responseData.secret ?? ''
      setResolvedSecret(nextSecret)
      return nextSecret
    } catch (error) {
      clearUnlock()
      setErrorMessage(readSecretUnlockError(error, 'Impossible de déverrouiller cet élément.'))
      return ''
    }
  }

  async function handleSecretCopy() {
    const secretValue = await resolveSecret()
    if (!secretValue) return
    await handleCopy(secretValue, `secret-${item.id}`)
  }

  async function handleSecretReveal() {
    if (isSecretVisible) return lockSecret()
    const secretValue = await resolveSecret()
    if (!secretValue) return
    setIsSecretVisible(true)
  }

  async function handleDelete() {
    if (!item) return
    if (!window.confirm('Confirmez-vous la suppression de cet élément ?')) return

    try {
      await deleteVaultItem(token, item.id)
      navigate(`/vaults/${vaultId}`)
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de supprimer cet élément.')
    }
  }

  async function handleAttachmentDownload(attachment) {
    try {
      await downloadVaultItemAttachment(token, attachment)
    } catch {
      setErrorMessage('Impossible de télécharger cette pièce jointe.')
    }
  }

  async function handleAttachmentPreview(attachment) {
    try {
      const { blob, mimeType } = await fetchVaultItemAttachmentPreview(token, attachment)
      const objectUrl = window.URL.createObjectURL(blob)
      setPreviewAttachment({
        id: attachment.id,
        name: attachment.name ?? 'Pièce jointe',
        mimeType,
        objectUrl,
      })
    } catch (error) {
      setErrorMessage(error.message ?? 'Impossible de consulter cette pièce jointe pour le moment.')
    }
  }

  function closeAttachmentPreview() {
    if (previewAttachment?.objectUrl) {
      window.URL.revokeObjectURL(previewAttachment.objectUrl)
    }
    setPreviewAttachment(null)
  }

  async function handleEditNavigation() {
    if (!item) return

    if (item.isSensitive && item.hasSecret) {
      const secretValue = await resolveSecret()
      if (!secretValue) return
      storeItemEditUnlock(item.id, secretValue)
    }

    navigate(`/vaults/${vaultId}/items/${itemId}/modifier`)
  }

  const permissionsSummary = useMemo(() => {
    if (!item) return []
    if ((item.itemPermissions ?? []).length === 0) return ['Droits hérités du trousseau']

    return item.itemPermissions.map((permission) => {
      const scopes = []
      if (permission.canView) scopes.push('lecture')
      if (permission.canEdit) scopes.push('édition')
      if (permission.canManageAttachments) scopes.push('pièces jointes')
      if (permission.canRevealSecret) scopes.push('secret')
      return `${permission.user?.displayName ?? 'Utilisateur'} : ${scopes.join(', ') || 'aucun droit'}`
    })
  }, [item])

  const shouldShowPinSetupBanner = authenticatedUser?.hasPin === false && item?.isSensitive === true
  const displayedSecret = isSecretVisible ? resolvedSecret : ''

  return (
    <section className="dashboard-shell item-shell">
      <article className="auth-card item-card">
        <div className="item-header-row">
          <div>
            <p className="eyebrow">Détail de l’élément</p>
            <h1 className="dashboard-title item-title">{item?.name ?? 'Élément'}</h1>
            <p className="lede">Consultez les données sensibles, les liens, les champs personnalisés et les pièces jointes depuis une fiche dédiée.</p>
          </div>
          <div className="item-header-actions">
            {item?.access?.canEdit ? <button className="button-link button-link-secondary" onClick={handleEditNavigation} type="button">Modifier</button> : null}
            <button className="button-link button-link-tertiary" onClick={() => navigate(`/vaults/${vaultId}`)} type="button">Retour au trousseau</button>
          </div>
        </div>

        {isLoading ? <p className="field-help">Chargement de l’élément...</p> : null}
        {shouldShowPinSetupBanner ? (
          <div className="pin-setup-banner" role="note">
            <div>
              <strong>Un code PIN sera demandé pour afficher ce mot de passe.</strong>
              <p>Définissez-le maintenant pour déverrouiller les secrets sensibles plus facilement.</p>
            </div>
            <button className="button-link button-link-secondary" onClick={() => navigate('/profil')} type="button">Configurer mon PIN</button>
          </div>
        ) : null}

        {item ? (
          <>
            <div className="item-meta-strip" aria-label="informations de l’élément">
              <span className="item-meta-chip"><span className="item-meta-label">Type</span><strong>{item.type === 'LOGIN' ? 'Identifiant' : item.type}</strong></span>
              <span className="item-meta-chip"><span className="item-meta-label">Accès</span><strong>{item.access?.canEdit ? 'Éditable' : 'Lecture seule'}</strong></span>
              <span className="item-meta-chip"><span className="item-meta-label">Sensibilité</span><strong>{item.isSensitive ? 'Sensible' : 'Standard'}</strong></span>
              <span className="item-meta-chip"><span className="item-meta-label">Créé le</span><strong>{formatDate(item.createdAt)}</strong></span>
              <span className="item-meta-chip"><span className="item-meta-label">Mis à jour</span><strong>{formatDateTime(item.updatedAt)}</strong></span>
            </div>

            {errorMessage ? <p className="field-feedback field-feedback-error contextual-error-banner">{errorMessage}</p> : null}

            <section className="item-section item-form-wide">
              <div className="vault-item-detail-grid">
                <CopyField copiedFieldKey={copiedFieldKey} fieldKey={`page-name-${item.id}`} label="Nom" onCopy={handleCopy} value={item.name} />
                <CopyField copiedFieldKey={copiedFieldKey} copyEnabled={Boolean(item.username)} copyValue={item.username} fieldKey={`page-username-${item.id}`} label="Identifiant" onCopy={handleCopy} value={item.username || 'Non renseigné'} />
                <div className="vault-item-copy-field">
                  <div className="vault-item-copy-field-head">
                    <span className="vault-item-copy-label">Mot de passe</span>
                    <span className="vault-item-copy-value">{item.hasSecret ? (displayedSecret || '••••••••••') : 'Aucun mot de passe enregistré.'}</span>
                  </div>
                  <div className="item-secret-actions">
                    {item.hasSecret ? <button aria-label={isSecretVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="item-copy-button" onClick={handleSecretReveal} title={isSecretVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} type="button"><FieldIcon kind={isSecretVisible ? 'eye-off' : 'eye'} /></button> : null}
                    {item.hasSecret ? <button aria-label="Copier le mot de passe" className="item-copy-button" onClick={handleSecretCopy} title="Copier le mot de passe" type="button"><FieldIcon kind={copiedFieldKey === `secret-${item.id}` ? 'check' : 'copy'} /></button> : null}
                  </div>
                </div>
                <CopyField copiedFieldKey={copiedFieldKey} copyEnabled={false} fieldKey="" label="Notes" onCopy={handleCopy} value={item.notes || 'Aucune note pour le moment.'} />
              </div>
            </section>

            <section className="item-section item-form-wide">
              <div className="item-section-header"><h2>URL associées</h2></div>
              <div className="vault-item-detail-list">
                {item.uris.length === 0 ? <p className="field-help">Aucune URL associée.</p> : null}
                {item.uris.map((uri, index) => (
                  <div className="vault-item-detail-row" key={uri.id ?? `${uri.uri}-${index}`}>
                    <CopyField copiedFieldKey={copiedFieldKey} fieldKey={`page-uri-${item.id}-${index}`} label={uri.label || `URL ${index + 1}`} onCopy={handleCopy} value={uri.uri} />
                    <a className="button-link button-link-secondary vault-item-inline-action" href={uri.uri} rel="noreferrer" target="_blank">Ouvrir</a>
                  </div>
                ))}
              </div>
            </section>

            <section className="item-section item-form-wide">
              <div className="item-section-header"><h2>Champs personnalisés</h2></div>
              <div className="vault-item-detail-list">
                {item.customFields.length === 0 ? <p className="field-help">Aucun champ personnalisé.</p> : null}
                {item.customFields.map((field, index) => (
                  <CopyField
                    copiedFieldKey={copiedFieldKey}
                    copyEnabled={!field.isSensitive && Boolean(field.value)}
                    copyValue={field.isSensitive ? '' : field.value}
                    fieldKey={`page-field-${item.id}-${index}`}
                    key={field.id ?? `${field.label}-${index}`}
                    label={`${field.label} · ${formatFieldType(field.type)}`}
                    onCopy={handleCopy}
                    value={field.isSensitive ? 'Valeur masquée' : field.value || 'Non renseigné'}
                  />
                ))}
              </div>
            </section>

            <section className="item-section item-form-wide">
              <div className="item-section-header"><h2>Pièces jointes</h2></div>
              <div className="vault-item-detail-list">
                {item.attachments.length === 0 ? <p className="field-help">Aucune pièce jointe.</p> : null}
                {item.attachments.map((attachment, index) => (
                  <div className="vault-item-detail-row" key={attachment.id}>
                    <CopyField copiedFieldKey={copiedFieldKey} copyValue={attachment.name} fieldKey={`page-attachment-${item.id}-${index}`} label={attachment.name} onCopy={handleCopy} value={formatAttachmentMeta(attachment)} />
                    <div className="vault-item-inline-actions">
                      {isPreviewableAttachment(attachment) ? (
                        <button className="button-link button-link-tertiary vault-item-inline-action" onClick={() => handleAttachmentPreview(attachment)} type="button">Consulter</button>
                      ) : null}
                      <button className="button-link button-link-secondary vault-item-inline-action" onClick={() => handleAttachmentDownload(attachment)} type="button">Télécharger</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="item-section item-form-wide">
              <div className="item-section-header"><h2>Permissions</h2></div>
              <ul className="item-list">
                {permissionsSummary.map((entry) => <li className="item-list-row" key={entry}>{entry}</li>)}
              </ul>
            </section>

            {item.access?.canDelete ? (
              <section className="item-section item-section-danger item-form-wide">
                <div className="item-form-actions item-form-wide">
                  <button className="button-link button-link-danger" onClick={handleDelete} type="button">Supprimer l’élément</button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </article>
      {previewAttachment ? (
        <div className="modal-backdrop" role="presentation" onClick={closeAttachmentPreview}>
          <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="attachment-preview-title">Prévisualisation</h2>
                <p>{previewAttachment.name}</p>
              </div>
              <button className="button-link button-link-tertiary" type="button" onClick={closeAttachmentPreview}>Fermer</button>
            </div>
            <div className="attachment-preview-content">
              {previewAttachment.mimeType === 'application/pdf' ? (
                <iframe src={previewAttachment.objectUrl} title={previewAttachment.name} className="attachment-preview-frame" />
              ) : (
                <img src={previewAttachment.objectUrl} alt={previewAttachment.name} className="attachment-preview-image" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function readSecretUnlockError(error, fallbackMessage) {
  const apiMessage = error?.responseData?.message
  if (apiMessage === 'Le code PIN fourni est invalide.') {
    return 'Impossible d’afficher ce mot de passe pour le moment. Le code PIN est incorrect.'
  }
  if (apiMessage === 'Le mot de passe du compte est invalide.') {
    return 'Impossible d’afficher ce mot de passe pour le moment. Le mot de passe du compte est incorrect.'
  }
  return apiMessage ?? fallbackMessage
}

function CopyField({ label, value, copyValue, fieldKey, copiedFieldKey, onCopy, copyEnabled = true }) {
  const effectiveValue = copyValue ?? value

  return (
    <div className="vault-item-copy-field">
      <div className="vault-item-copy-field-head">
        <span className="vault-item-copy-label">{label}</span>
        <span className="vault-item-copy-value">{value}</span>
      </div>
      {copyEnabled ? <button aria-label={`Copier ${label}`} className="item-copy-button" onClick={() => onCopy(effectiveValue, fieldKey)} title={`Copier ${label}`} type="button"><FieldIcon kind={copiedFieldKey === fieldKey ? 'check' : 'copy'} /></button> : null}
    </div>
  )
}

function formatFieldType(type) {
  switch (type) {
    case 'email':
      return 'E-mail'
    case 'date':
      return 'Date'
    default:
      return 'Texte'
  }
}

function formatDate(value) {
  if (!value) return 'Date indisponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return 'Date indisponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatAttachmentMeta(attachment) {
  const sizeInKb = Math.max(1, Math.round((attachment.size ?? 0) / 1024))
  return `${attachment.mimeType} · ${sizeInKb} Ko`
}

function isPreviewableAttachment(attachment) {
  const mimeType = attachment?.mimeType ?? ''
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

async function requestSensitiveUnlockProof(requestSecretCredential, requestPin, canUsePin, message) {
  if (typeof requestSecretCredential === 'function') {
    return requestSecretCredential(message, { allowPin: canUsePin })
  }

  if (!canUsePin || typeof requestPin !== 'function') {
    return null
  }

  const pin = await requestPin('Saisissez votre code PIN pour déverrouiller cet élément.')
  if (pin === null) {
    return null
  }

  return { method: 'pin', value: pin }
}

function FieldIcon({ kind }) {
  if (kind === 'eye' || kind === 'eye-off') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M2.5 10s2.8-4 7.5-4 7.5 4 7.5 4-2.8 4-7.5 4-7.5-4-7.5-4Z" />
        <path d="M10 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
        {kind === 'eye-off' ? <path d="M4 16 16 4" /> : null}
      </svg>
    )
  }

  if (kind === 'copy' || kind === 'check') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        {kind === 'copy' ? (
          <>
            <rect height="8.5" rx="1.6" width="8.5" x="7.2" y="7.2" />
            <path d="M5.6 12.8H5A1.8 1.8 0 0 1 3.2 11V5A1.8 1.8 0 0 1 5 3.2h6A1.8 1.8 0 0 1 12.8 5v.6" />
          </>
        ) : (
          <path d="m4.6 10.4 3.3 3.3 7.5-7.6" />
        )}
      </svg>
    )
  }

  return null
}


