import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { verifyUserPin } from '../../services/api/authApi.js'
import {
  deleteVaultItem,
  downloadVaultItemAttachment,
  fetchVaultItem,
  fetchVaultItems,
  unlockVaultItemSecret,
} from '../../services/api/itemApi.js'
import { storeItemEditUnlock } from '../../services/storage/itemEditUnlockStorage.js'
import { useSecretUnlockSession } from '../../hooks/useSecretUnlockSession.js'
import { useSecretMaskTimeoutMs } from '../../hooks/useSecretMaskTimeoutMs.js'
import { exportVaultDataFile, generatePassword } from '../../services/api/advancedApi.js'
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
  const { clearUnlock, isUnlocked, requestPin } = useSecretUnlockSession()
  const secretMaskTimeoutMs = useSecretMaskTimeoutMs()

  const [vault, setVault] = useState(null)
  const [items, setItems] = useState([])
  const [itemSearch, setItemSearch] = useState('')
  const [isItemSearchTouched, setIsItemSearchTouched] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false)
  const [isSettingsSubmitting, setIsSettingsSubmitting] = useState(false)
  const [isMembersSubmitting, setIsMembersSubmitting] = useState(false)
  const [isItemDetailsLoading, setIsItemDetailsLoading] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsDescription, setSettingsDescription] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('VIEWER')
  const [memberFeedbackMessage, setMemberFeedbackMessage] = useState('')
  const [memberErrorMessage, setMemberErrorMessage] = useState('')
  const [selectedItemDetails, setSelectedItemDetails] = useState(null)
  const [copiedFieldKey, setCopiedFieldKey] = useState('')
  const [visibleSecrets, setVisibleSecrets] = useState({})
  const [resolvedSecrets, setResolvedSecrets] = useState({})
  const [isSelectedItemSecretVisible, setIsSelectedItemSecretVisible] = useState(false)
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false)
  const [passwordOptions, setPasswordOptions] = useState({
    length: 20,
    useLowercase: true,
    useUppercase: true,
    useDigits: true,
    useSymbols: true,
    exclude: '',
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)

  const vaultMembers = Array.isArray(vault?.members) ? vault.members : []
  const canEditVault = Boolean(vault?.access?.canEdit)
  const canDeleteVault = Boolean(vault?.access?.canDelete)
  const canManageMembers = Boolean(vault?.access?.canManageMembers)
  const canLeaveVault = Boolean(authenticatedUser?.id) && !canManageMembers && vaultMembers.some((member) => member?.user?.id === authenticatedUser.id)

  const clearItemSecret = useCallback((itemId) => {
    if (!itemId) return

    setVisibleSecrets((currentValue) => {
      if (!(itemId in currentValue)) return currentValue
      const nextValue = { ...currentValue }
      delete nextValue[itemId]
      return nextValue
    })

    setResolvedSecrets((currentValue) => {
      if (!(itemId in currentValue)) return currentValue
      const nextValue = { ...currentValue }
      delete nextValue[itemId]
      return nextValue
    })

    if (selectedItemDetails?.id === itemId) {
      setIsSelectedItemSecretVisible(false)
    }
  }, [selectedItemDetails?.id])

  const clearAllSecrets = useCallback(() => {
    setVisibleSecrets({})
    setResolvedSecrets({})
    setIsSelectedItemSecretVisible(false)
  }, [])

  const loadVault = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [vaultResponseData, itemResponseData] = await Promise.all([
        fetchVault(token, vaultId),
        fetchVaultItems(token, vaultId),
      ])

      const nextVault = vaultResponseData?.vault ?? null
      const nextItems = Array.isArray(itemResponseData?.items) ? itemResponseData.items : []

      setVault(nextVault)
      setItems(nextItems)
      setSettingsName(nextVault?.name ?? '')
      setSettingsDescription(nextVault?.description ?? '')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de charger le trousseau.')
    } finally {
      setIsLoading(false)
    }
  }, [token, vaultId])

  useEffect(() => {
    loadVault()
  }, [loadVault])

  useEffect(() => {
    const visibleItemIds = Object.keys(visibleSecrets).filter((itemId) => visibleSecrets[itemId])
    if (visibleItemIds.length === 0) return undefined

    const timeoutIds = visibleItemIds.map((itemId) => window.setTimeout(() => clearItemSecret(itemId), secretMaskTimeoutMs))
    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [clearItemSecret, secretMaskTimeoutMs, visibleSecrets])

  useEffect(() => {
    if (!isSelectedItemSecretVisible || !selectedItemDetails?.id) return undefined

    const timeoutId = window.setTimeout(() => {
      clearItemSecret(selectedItemDetails.id)
    }, secretMaskTimeoutMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [clearItemSecret, isSelectedItemSecretVisible, secretMaskTimeoutMs, selectedItemDetails?.id])

  useEffect(() => {
    if (!isUnlocked) {
      clearAllSecrets()
    }
  }, [clearAllSecrets, isUnlocked])

  useEffect(() => {
    // Certains navigateurs injectent un autofill tardif même avec autocomplete désactivé.
    if (isItemSearchTouched) return undefined

    const clearSoon = window.setTimeout(() => setItemSearch(''), 0)
    const clearAfterPaint = window.setTimeout(() => setItemSearch(''), 250)

    return () => {
      window.clearTimeout(clearSoon)
      window.clearTimeout(clearAfterPaint)
    }
  }, [isItemSearchTouched])

  const filteredItems = useMemo(() => {
    const normalizedSearch = itemSearch.trim().toLowerCase()
    if (normalizedSearch === '') return items

    return items.filter((item) => {
      const uris = Array.isArray(item?.uris) ? item.uris : []
      const haystack = [item?.name, item?.username, ...uris.flatMap((uri) => [uri?.label, uri?.uri])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [itemSearch, items])

  const shouldShowPinSetupBanner = useMemo(
    () => authenticatedUser?.hasPin === false && items.some((item) => item?.isSensitive),
    [authenticatedUser?.hasPin, items],
  )

  const itemColumnSizes = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    const longestName = list.reduce((max, item) => Math.max(max, (item?.name ?? '').length), 'Non renseigné'.length)
    const longestUsername = list.reduce((max, item) => Math.max(max, (item?.username ?? '').length), 'Aucun identifiant renseigné.'.length)
    const longestSecretText = list.reduce((max, item) => {
      if (item?.hasSecret) return Math.max(max, '••••••••••'.length)
      return Math.max(max, 'Aucun mot de passe enregistré.'.length)
    }, 10)

    const nameCh = Math.min(Math.max(longestName + 7, 14), 34)
    const usernameCh = Math.min(Math.max(longestUsername + 7, 18), 46)
    const secretCh = Math.min(Math.max(longestSecretText + 17, 28), 56)

    return {
      name: `${nameCh}ch`,
      username: `${usernameCh}ch`,
      secret: `${secretCh}ch`,
      rowMin: `${nameCh + usernameCh + secretCh}ch`,
    }
  }, [items])

  const membersSectionDescription = useMemo(() => {
    if (!vault) return ''
    if (vault.type === 'PERSONAL' && vaultMembers.length <= 1) {
      return 'Invitez un premier membre pour partager ce trousseau. Il deviendra automatiquement partagé.'
    }
    if (canManageMembers) {
      return 'Invitez un membre et choisissez son niveau d’accès dès l’ajout.'
    }
    return 'Vous pouvez consulter les membres de ce trousseau, sans modifier leurs accès.'
  }, [canManageMembers, vault, vaultMembers.length])

  async function reloadVault(nextFeedbackMessage = '') {
    setFeedbackMessage('')
    setErrorMessage('')
    await loadVault()
    if (nextFeedbackMessage) setFeedbackMessage(nextFeedbackMessage)
  }

  async function handleCopyToClipboard(value, fieldKey) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedFieldKey(fieldKey)
      window.setTimeout(() => {
        setCopiedFieldKey((currentValue) => (currentValue === fieldKey ? '' : currentValue))
      }, 1400)
    } catch {
      setErrorMessage('Impossible de copier cette information pour le moment.')
    }
  }

  async function resolveSecretValue(item) {
    const cachedSecret = resolvedSecrets[item.id]
    if (cachedSecret) return cachedSecret

    if (item.isSensitive) {
      if (authenticatedUser?.hasPin === false) {
        setErrorMessage('Vous n’avez pas encore défini votre code PIN.')
        return ''
      }

      const pin = await requestPin('Saisissez votre code PIN pour déverrouiller ce secret.')
      if (pin === null) return ''

      try {
        const responseData = await unlockVaultItemSecret(token, item.id, pin)
        const secretValue = responseData.secret ?? ''
        if (!secretValue) return ''

        setResolvedSecrets((currentValue) => ({
          ...currentValue,
          [item.id]: secretValue,
        }))

        return secretValue
      } catch (error) {
        clearUnlock()
        throw error
      }
    }

    const responseData = await fetchVaultItem(token, item.id)
    const secretValue = responseData.item?.secret ?? ''
    if (!secretValue) return ''

    setResolvedSecrets((currentValue) => ({
      ...currentValue,
      [item.id]: secretValue,
    }))

    return secretValue
  }

  async function handleSecretCopy(item) {
    try {
      const secretValue = await resolveSecretValue(item)
      if (!secretValue) return
      await handleCopyToClipboard(secretValue, `secret-${item.id}`)
    } catch (error) {
      setErrorMessage(readSecretUnlockError(error, 'Impossible de copier ce mot de passe pour le moment.'))
    }
  }

  async function toggleSecretVisibility(item) {
    if (!item?.hasSecret) {
      setErrorMessage('Aucun mot de passe enregistré pour cet élément.')
      return
    }

    if (visibleSecrets[item.id]) {
      clearItemSecret(item.id)
      return
    }

    try {
      await resolveSecretValue(item)
      setVisibleSecrets((currentValue) => ({ ...currentValue, [item.id]: true }))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(readSecretUnlockError(error, 'Impossible d’afficher ce mot de passe pour le moment.'))
    }
  }

  async function openPrimaryUri(item) {
    const primaryUri = Array.isArray(item?.uris) ? item.uris.find((uri) => uri?.uri) : null
    if (!primaryUri?.uri) {
      setErrorMessage('Aucune URL associée à cet élément.')
      return
    }

    window.open(primaryUri.uri, '_blank', 'noopener,noreferrer')
  }

  async function openItemDetailsModal(item) {
    setIsItemDetailsOpen(true)
    setIsItemDetailsLoading(true)
    setSelectedItemDetails(null)
    setErrorMessage('')
    setIsSelectedItemSecretVisible(false)

    try {
      const responseData = await fetchVaultItem(token, item.id)
      setSelectedItemDetails(responseData.item ?? null)
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de charger le détail de cet élément.')
      setIsItemDetailsOpen(false)
    } finally {
      setIsItemDetailsLoading(false)
    }
  }

  function closeItemDetailsModal() {
    if (selectedItemDetails?.id) {
      clearItemSecret(selectedItemDetails.id)
    }
    setSelectedItemDetails(null)
    setIsSelectedItemSecretVisible(false)
    setIsItemDetailsOpen(false)
  }

  async function toggleSelectedItemSecretVisibility() {
    if (!selectedItemDetails?.hasSecret) {
      setErrorMessage('Aucun mot de passe enregistré pour cet élément.')
      return
    }

    if (isSelectedItemSecretVisible) {
      clearItemSecret(selectedItemDetails.id)
      return
    }

    try {
      await resolveSecretValue(selectedItemDetails)
      setIsSelectedItemSecretVisible(true)
      setVisibleSecrets((currentValue) => ({ ...currentValue, [selectedItemDetails.id]: true }))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(readSecretUnlockError(error, 'Impossible d’afficher ce mot de passe pour le moment.'))
    }
  }

  async function handleSelectedItemEditNavigation() {
    if (!selectedItemDetails) return

    try {
      if (selectedItemDetails.isSensitive && selectedItemDetails.hasSecret) {
        if (authenticatedUser?.hasPin === false) {
          setErrorMessage('Vous n’avez pas encore défini votre code PIN.')
          return
        }

        const secretValue = await resolveSecretValue(selectedItemDetails)
        if (secretValue) {
          storeItemEditUnlock(selectedItemDetails.id, secretValue)
        }
      }

      navigate(`/vaults/${vaultId}/items/${selectedItemDetails.id}/modifier`)
    } catch (error) {
      setErrorMessage(readSecretUnlockError(error, 'Impossible d’ouvrir la page de modification pour le moment.'))
    }
  }

  async function handleSelectedItemDelete() {
    if (!selectedItemDetails) return
    const confirmed = window.confirm('Supprimer cet élément définitivement ?')
    if (!confirmed) return

    try {
      await deleteVaultItem(token, selectedItemDetails.id)
      closeItemDetailsModal()
      await reloadVault('L’élément a bien été supprimé.')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de supprimer cet élément pour le moment.')
    }
  }

  async function handleItemAttachmentDownload(attachment) {
    try {
      await downloadVaultItemAttachment(token, attachment)
    } catch (error) {
      setErrorMessage(error.message ?? 'Impossible de télécharger cette pièce jointe.')
    }
  }

  async function handleVaultSettingsSubmit(event) {
    event.preventDefault()
    setIsSettingsSubmitting(true)
    setErrorMessage('')

    try {
      const responseData = await updateVault(token, vaultId, {
        name: settingsName.trim(),
        description: settingsDescription.trim(),
      })
      setVault(responseData.vault)
      setIsSettingsOpen(false)
      setFeedbackMessage('Les paramètres du trousseau ont bien été mis à jour.')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de mettre à jour le trousseau.')
    } finally {
      setIsSettingsSubmitting(false)
    }
  }


  async function handleExportCurrentVault() {
    const pin = await requestPin('Saisissez votre code PIN pour continuer.', { forcePrompt: true })
    if (pin === null) return

    try {
      await verifyUserPin(token, pin)
    } catch (error) {
      clearUnlock()
      setErrorMessage(error.responseData?.message ?? 'Le code PIN est incorrect.')
      return
    }

    try {
      await exportVaultDataFile(token, vaultId, 'json', vault?.name ?? '')
      setFeedbackMessage('Export du trousseau téléchargé.')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message ?? 'Impossible d’exporter ce trousseau.')
    }
  }

  function handleGeneratePassword() {
    setErrorMessage('')
    setFeedbackMessage('')
    setIsPasswordGeneratorOpen(true)
  }

  async function handlePasswordGenerationSubmit(event) {
    event.preventDefault()
    setIsGeneratingPassword(true)
    setErrorMessage('')

    try {
      const responseData = await generatePassword(token, passwordOptions)
      setGeneratedPassword(responseData.password ?? '')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de générer un mot de passe pour le moment.')
    } finally {
      setIsGeneratingPassword(false)
    }
  }

  async function handleCopyGeneratedPassword() {
    if (!generatedPassword) return

    try {
      await navigator.clipboard.writeText(generatedPassword)
      setFeedbackMessage('Mot de passe copié dans le presse-papiers.')
    } catch {
      setErrorMessage('Impossible de copier ce mot de passe pour le moment.')
    }
  }
  async function handleVaultDelete() {
    const confirmed = window.confirm('Supprimer ce trousseau définitivement ?')
    if (!confirmed) return

    try {
      await deleteVault(token, vaultId)
      navigate('/vaults')
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de supprimer ce trousseau.')
    }
  }

  async function handleMemberSubmit(event) {
    event.preventDefault()
    setMemberFeedbackMessage('')
    setMemberErrorMessage('')

    if (memberEmail.trim() === '') {
      setMemberErrorMessage('Renseignez une adresse e-mail avant d’ajouter un membre.')
      return
    }

    setIsMembersSubmitting(true)

    try {
      await addVaultMember(token, vaultId, {
        email: memberEmail.trim(),
        role: memberRole,
      })
      setMemberEmail('')
      setMemberRole('VIEWER')
      setMemberFeedbackMessage('Invitation enregistrée. Le membre apparaît maintenant dans la liste.')
      await reloadVault()
    } catch (error) {
      setMemberErrorMessage(error.responseData?.message ?? 'Impossible d’ajouter ce membre.')
    } finally {
      setIsMembersSubmitting(false)
    }
  }

  async function handleMemberRoleChange(memberId, nextRole) {
    try {
      await updateVaultMember(token, vaultId, memberId, { role: nextRole })
      await reloadVault('Le rôle du membre a bien été mis à jour.')
    } catch (error) {
      setMemberErrorMessage(error.responseData?.message ?? 'Impossible de mettre à jour ce rôle.')
    }
  }

  async function handleMemberDelete(memberId) {
    const confirmed = window.confirm('Retirer ce membre du trousseau ?')
    if (!confirmed) return

    try {
      await deleteVaultMember(token, vaultId, memberId)
      await reloadVault('Le membre a bien été retiré du trousseau.')
    } catch (error) {
      setMemberErrorMessage(error.responseData?.message ?? 'Impossible de retirer ce membre.')
    }
  }

  async function handleLeaveVault() {
    const currentMember = vaultMembers.find((member) => member?.user?.id === authenticatedUser?.id)
    if (!currentMember) return

    const confirmed = window.confirm('Voulez-vous quitter ce trousseau ?')
    if (!confirmed) return

    try {
      await deleteVaultMember(token, vaultId, currentMember.id)
      navigate('/vaults')
    } catch (error) {
      setMemberErrorMessage(error.responseData?.message ?? 'Impossible de quitter ce trousseau pour le moment.')
    }
  }

  if (isLoading) {
    return (
      <section className="dashboard-shell vault-shell">
        <article className="auth-card vault-card">
          <p>Chargement du trousseau...</p>
        </article>
      </section>
    )
  }

  if (!vault) {
    return (
      <section className="dashboard-shell vault-shell">
        <article className="auth-card vault-card">
          <div className="feedback-banner feedback-banner-error">{errorMessage || 'Trousseau introuvable.'}</div>
        </article>
      </section>
    )
  }

  return (
    <>
      <section className="dashboard-shell vault-shell">
        <article className="auth-card vault-card">
          <div className="vault-header-row">
            <div>
              <span className="eyebrow">Détail du trousseau</span>
              <h1 className="dashboard-title vault-title">{vault.name}</h1>
              <p className="lede">Consultez les membres, les paramètres et les éléments de ce trousseau depuis un seul espace clair.</p>
              <div className="vault-meta-strip">
                <span className="vault-meta-chip"><span className="vault-meta-label">Type</span><strong>{vault.type === 'PERSONAL' ? 'Personnel' : 'Partagé'}</strong></span>
                <span className="vault-meta-chip"><span className="vault-meta-label">Votre accès</span><strong>{formatRole(vault.access?.role)}</strong></span>
                <span className="vault-meta-chip"><span className="vault-meta-label">Propriétaire</span><strong>{vault.owner?.displayName ?? 'Non renseigné'}</strong></span>
                <span className="vault-meta-chip"><span className="vault-meta-label">Membres</span><strong>{vaultMembers.length}</strong></span>
                <span className="vault-meta-chip"><span className="vault-meta-label">Éléments</span><strong>{items.length}</strong></span>
              </div>
            </div>

            <div className="vault-actions-row">
              <button className="button-link button-link-secondary" type="button" onClick={() => navigate('/vaults')}>
                Trousseaux
              </button>
              <button className="button-link button-link-secondary" type="button" onClick={handleGeneratePassword}>
                Générateur
              </button>
              <button
                aria-label="Membres"
                className="button-link button-link-secondary vault-action-icon-button"
                title="Membres"
                type="button"
                onClick={() => setIsMembersOpen(true)}
              >
                <FieldIcon name="members" />
              </button>
              {canEditVault && (
                <button
                  aria-label="Paramètres"
                  className="button-link button-link-secondary vault-action-icon-button"
                  title="Paramètres"
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <FieldIcon name="settings" />
                </button>
              )}
            </div>
          </div>

          {feedbackMessage ? <div className="feedback-banner feedback-banner-success">{feedbackMessage}</div> : null}

          <section className="item-section">
            <div className="item-section-header">
              <div>
                <h2>Éléments du trousseau</h2>
                <p>Retrouvez ici vos identifiants, vos URL associées et les pièces jointes du trousseau.</p>
              </div>
            </div>

            <div className="vault-toolbar vault-toolbar-surface vault-toolbar-with-action">
              <label className="field vault-search-field">
                <span>Recherche</span>
                <input
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  id="vault-item-search"
                  name="vault_item_search"
                  onChange={(event) => {
                    setIsItemSearchTouched(true)
                    setItemSearch(event.target.value)
                  }}
                  placeholder="Nom, identifiant ou URL"
                  spellCheck={false}
                  type="text"
                  value={itemSearch}
                />
              </label>

              <div aria-live="polite" className="vault-toolbar-meta">
                <span className="badge badge-info">
                  {filteredItems.length} élément{filteredItems.length > 1 ? 's' : ''}
                </span>
                <p>
                  {itemSearch.trim() !== ''
                    ? 'Résultats filtrés sur votre recherche.'
                    : 'Les éléments récents restent visibles en premier.'}
                </p>
              </div>

              {canEditVault ? (
                <button className="button-link button-link-primary vault-create-button" type="button" onClick={() => navigate(`/vaults/${vaultId}/items/nouveau`)}>
                  Ajouter un élément
                </button>
              ) : null}
            </div>

            {shouldShowPinSetupBanner ? (
              <div className="pin-setup-banner">
                <strong>Certains mots de passe demanderont un code PIN.</strong>
                <p>Définissez votre code PIN maintenant pour éviter le blocage au moment de l’affichage.</p>
                <button className="button-link button-link-secondary" type="button" onClick={() => navigate('/profil')}>
                  Configurer mon PIN
                </button>
              </div>
            ) : null}

            {errorMessage ? <div className="feedback-banner feedback-banner-error">{errorMessage}</div> : null}

            <div
              className="vault-list vault-items-list"
              style={{
                '--item-col-name': itemColumnSizes.name,
                '--item-col-username': itemColumnSizes.username,
                '--item-col-secret': itemColumnSizes.secret,
                '--item-row-min': itemColumnSizes.rowMin,
              }}
            >
              {filteredItems.length === 0 ? (
                <div className="item-empty-state">
                  <p>{itemSearch.trim() === '' ? 'Aucun élément dans ce trousseau pour le moment.' : 'Aucun élément ne correspond à cette recherche.'}</p>
                </div>
              ) : filteredItems.map((item) => {
                const isSecretVisible = Boolean(visibleSecrets[item.id])
                const resolvedSecret = resolvedSecrets[item.id] ?? ''
                const hasPrimaryUri = Array.isArray(item?.uris) && item.uris.some((uri) => uri?.uri)

                return (
                  <article className="auth-card vault-list-item" key={item.id}>
                    <div className="vault-item-detail-row">
                      <CopyField
                        label="Nom"
                        value={item.name || 'Non renseigné'}
                        fieldKey={`name-${item.id}`}
                        copiedFieldKey={copiedFieldKey}
                        onCopy={() => handleCopyToClipboard(item.name || '', `name-${item.id}`)}
                        icon="globe"
                        compact
                        fieldClass="vault-item-copy-field--name"
                      />
                      <CopyField
                        label="Identifiant"
                        value={item.username || 'Aucun identifiant renseigné.'}
                        fieldKey={`username-${item.id}`}
                        copiedFieldKey={copiedFieldKey}
                        onCopy={() => handleCopyToClipboard(item.username || '', `username-${item.id}`)}
                        icon="account"
                        compact
                        fieldClass="vault-item-copy-field--username"
                      />
                      <div className="vault-item-copy-field vault-item-copy-field-compact vault-item-copy-field--secret">
                        <div className="vault-item-copy-field-head">
                          <FieldIcon name="secret" />
                        </div>
                        <div className="vault-item-copy-field-body">
                          <p>{item.hasSecret ? (isSecretVisible ? resolvedSecret : '••••••••••') : 'Aucun mot de passe enregistré.'}</p>
                        </div>
                        <div className="secret-action-stack">
                          <div className={`secret-pin-indicator ${item.isSensitive ? 'secret-pin-indicator-required' : 'secret-pin-indicator-open'}`} title={item.isSensitive ? 'Code PIN requis' : 'Affichage direct'}>
                            <FieldIcon name={item.isSensitive ? 'lock-closed' : 'lock-open'} />
                          </div>
                          {item.hasSecret ? (
                            <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={() => toggleSecretVisibility(item)} title={isSecretVisible ? 'Masquer' : 'Afficher'}>
                              <FieldIcon name={isSecretVisible ? 'eye-off' : 'eye'} />
                            </button>
                          ) : null}
                          {item.hasSecret ? (
                            <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={() => handleSecretCopy(item)} title="Copier le mot de passe">
                              <FieldIcon name={copiedFieldKey === `secret-${item.id}` ? 'check' : 'copy'} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="vault-list-footer">
                      <button className="button-link button-link-tertiary vault-item-inline-action" type="button" onClick={() => openPrimaryUri(item)} title="Ouvrir l’URL associée" disabled={!hasPrimaryUri}>
                        <FieldIcon name="link" />
                      </button>
                      <button className="button-link button-link-secondary vault-list-action" type="button" onClick={() => openItemDetailsModal(item)}>
                        Plus
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </article>
      </section>

      {isSettingsOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-card vault-settings-modal" role="dialog" aria-modal="true" aria-labelledby="vault-settings-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="vault-settings-title">Paramètres du trousseau</h2>
                <p>Ajustez le nom et la description du trousseau.</p>
              </div>
              <div className="modal-header-actions">
                <button className="button-link button-link-secondary" type="button" onClick={handleExportCurrentVault}>Exporter</button>
                <button className="button-link button-link-tertiary" type="button" onClick={() => setIsSettingsOpen(false)}>Fermer</button>
              </div>
            </div>

            <form className="vault-form vault-settings-form" onSubmit={handleVaultSettingsSubmit}>
              <label className="field">
                <span>Nom du trousseau</span>
                <input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} />
              </label>
              <label className="field">
                <span>Description du trousseau</span>
                <textarea value={settingsDescription} onChange={(event) => setSettingsDescription(event.target.value)} rows={4} />
              </label>
              <div className="modal-actions">
                <button className="button-link button-link-primary" type="submit" disabled={isSettingsSubmitting}>Enregistrer</button>
              </div>
            </form>

            {canDeleteVault ? (
              <div className="modal-section modal-section-danger">
                <button className="button-link button-link-danger" type="button" onClick={handleVaultDelete}>Supprimer le trousseau</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isMembersOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsMembersOpen(false)}>
          <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-labelledby="vault-members-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="vault-members-title">Membres du trousseau</h2>
                <p>{membersSectionDescription}</p>
              </div>
              <div className="modal-header-actions">
                <button className="button-link button-link-tertiary" type="button" onClick={() => setIsMembersOpen(false)}>Fermer</button>
              </div>
            </div>

            {canManageMembers ? (
              <div className="modal-section">
                <div className="modal-section-header">
                  <h3>Gérer les membres du trousseau</h3>
                </div>
                <form className="vault-form vault-members-form" onSubmit={handleMemberSubmit}>
                  <label className="field">
                    <span>Adresse e-mail</span>
                    <input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} />
                  </label>
                  <label className="field vault-role-field">
                    <span>Rôle</span>
                    <select className="vault-role-select" value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
                      <option value="VIEWER">Lecteur</option>
                      <option value="EDITOR">Éditeur</option>
                    </select>
                  </label>
                  <div className="modal-actions vault-members-actions">
                    <button className="button-link button-link-primary" type="submit" disabled={isMembersSubmitting}>Ajouter un membre</button>
                  </div>
                </form>
              </div>
            ) : null}

            {memberFeedbackMessage ? <div className="feedback-banner feedback-banner-success">{memberFeedbackMessage}</div> : null}
            {memberErrorMessage ? <div className="feedback-banner feedback-banner-error">{memberErrorMessage}</div> : null}

            <div className="modal-section vault-table-card">
              <div className="modal-section-header">
                <h3>Membres actuels</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Rôle</th>
                    <th>Intégré le</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultMembers.map((member) => {
                    const isOwner = member.role === 'OWNER'
                    const isCurrentUser = member.user?.id === authenticatedUser?.id
                    const canManageThisMember = canManageMembers && !isOwner

                    return (
                      <tr key={member.id}>
                        <td>{member.user?.displayName ?? 'Utilisateur'}</td>
                        <td>
                          {isOwner ? 'Propriétaire' : canManageThisMember ? (
                            <span className="vault-role-field">
                              <select className="vault-role-select" value={member.role} onChange={(event) => handleMemberRoleChange(member.id, event.target.value)}>
                                <option value="VIEWER">Lecteur</option>
                                <option value="EDITOR">Éditeur</option>
                              </select>
                            </span>
                          ) : formatRole(member.role)}
                        </td>
                        <td>{formatMemberDate(member.createdAt)}</td>
                        <td>
                          {canManageThisMember ? (
                            <button className="button-link button-link-tertiary" type="button" onClick={() => handleMemberDelete(member.id)}>Retirer</button>
                          ) : isCurrentUser && canLeaveVault ? (
                            <button className="button-link button-link-tertiary" type="button" onClick={handleLeaveVault}>Quitter le trousseau</button>
                          ) : isCurrentUser ? 'Vous' : 'Lecture seule'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {isPasswordGeneratorOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPasswordGeneratorOpen(false)}>
          <div className="modal-card vault-password-generator-modal" role="dialog" aria-modal="true" aria-labelledby="vault-password-generator-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="vault-password-generator-title">Générer un mot de passe</h2>
                <p>Configurez les règles puis copiez le mot de passe généré.</p>
              </div>
              <div className="modal-header-actions">
                <button className="button-link button-link-tertiary" type="button" onClick={() => setIsPasswordGeneratorOpen(false)}>Fermer</button>
              </div>
            </div>

            <form className="vault-form" onSubmit={handlePasswordGenerationSubmit}>
              <label className="field">
                <span>Longueur</span>
                <input min="8" max="128" type="number" value={passwordOptions.length} onChange={(event) => setPasswordOptions((current) => ({ ...current, length: Number(event.target.value) || 20 }))} />
              </label>
              <label className="field">
                <span>Exclure des caractères</span>
                <input type="text" placeholder="Ex: O0lI" value={passwordOptions.exclude} onChange={(event) => setPasswordOptions((current) => ({ ...current, exclude: event.target.value }))} />
              </label>

              <div className="dashboard-options-grid">
                <label className="checkbox-option"><input type="checkbox" checked={passwordOptions.useLowercase} onChange={(event) => setPasswordOptions((current) => ({ ...current, useLowercase: event.target.checked }))} /><span>Minuscules</span></label>
                <label className="checkbox-option"><input type="checkbox" checked={passwordOptions.useUppercase} onChange={(event) => setPasswordOptions((current) => ({ ...current, useUppercase: event.target.checked }))} /><span>Majuscules</span></label>
                <label className="checkbox-option"><input type="checkbox" checked={passwordOptions.useDigits} onChange={(event) => setPasswordOptions((current) => ({ ...current, useDigits: event.target.checked }))} /><span>Chiffres</span></label>
                <label className="checkbox-option"><input type="checkbox" checked={passwordOptions.useSymbols} onChange={(event) => setPasswordOptions((current) => ({ ...current, useSymbols: event.target.checked }))} /><span>Symboles</span></label>
              </div>

              <div className="modal-actions">
                <button className="button-link button-link-primary" type="submit" disabled={isGeneratingPassword}>Générer</button>
              </div>
            </form>

            {generatedPassword ? (
              <div className="vault-item-copy-field dashboard-generated-password">
                <div className="vault-item-copy-field-body">
                  <p>{generatedPassword}</p>
                </div>
                <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={handleCopyGeneratedPassword} title="Copier">Copier</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {isItemDetailsOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeItemDetailsModal}>
          <div className="modal-card modal-card-wide vault-item-detail-modal" role="dialog" aria-modal="true" aria-labelledby="vault-item-details-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Élément</span>
                <h2 id="vault-item-details-title">{selectedItemDetails?.name ?? 'Détail de l’élément'}</h2>
              </div>
              <div className="modal-header-actions">
                {selectedItemDetails?.access?.canEdit ? <button className="button-link button-link-secondary" type="button" onClick={handleSelectedItemEditNavigation}>Modifier</button> : null}
                <button className="button-link button-link-tertiary" type="button" onClick={closeItemDetailsModal}>Fermer</button>
              </div>
            </div>

            {isItemDetailsLoading ? (
              <p>Chargement du détail de l’élément...</p>
            ) : selectedItemDetails ? (
              <>
                <div className="vault-meta-strip">
                  <span className="vault-meta-chip"><span className="vault-meta-label">Type</span><strong>{selectedItemDetails.type ?? 'Identifiant'}</strong></span>
                  <span className="vault-meta-chip"><span className="vault-meta-label">Accès</span><strong>{selectedItemDetails.access?.canEdit ? 'Éditable' : 'Lecture seule'}</strong></span>
                  <span className="vault-meta-chip"><span className="vault-meta-label">Créé le</span><strong>{formatDateTime(selectedItemDetails.createdAt)}</strong></span>
                  <span className="vault-meta-chip"><span className="vault-meta-label">Mis à jour</span><strong>{formatDateTime(selectedItemDetails.updatedAt)}</strong></span>
                </div>

                <div className="modal-section vault-item-detail-stack">
                  <div className="vault-item-detail-grid">
                    <CopyField label="Nom" value={selectedItemDetails.name || 'Non renseigné'} fieldKey={`detail-name-${selectedItemDetails.id}`} copiedFieldKey={copiedFieldKey} onCopy={() => handleCopyToClipboard(selectedItemDetails.name || '', `detail-name-${selectedItemDetails.id}`)} icon="name" />
                    <CopyField label="Identifiant" value={selectedItemDetails.username || 'Aucun identifiant renseigné.'} fieldKey={`detail-username-${selectedItemDetails.id}`} copiedFieldKey={copiedFieldKey} onCopy={() => handleCopyToClipboard(selectedItemDetails.username || '', `detail-username-${selectedItemDetails.id}`)} icon="username" />
                    <div className="vault-item-copy-field">
                      <div className="vault-item-copy-field-head">
                        <FieldIcon name="secret" />
                        <span>Mot de passe</span>
                        <div className={`secret-pin-indicator ${selectedItemDetails.isSensitive ? 'secret-pin-indicator-required' : 'secret-pin-indicator-open'}`} title={selectedItemDetails.isSensitive ? 'Code PIN requis' : 'Affichage direct'}>
                          <FieldIcon name={selectedItemDetails.isSensitive ? 'lock-closed' : 'lock-open'} />
                        </div>
                      </div>
                      <div className="vault-item-copy-field-body">
                        <p>{selectedItemDetails.hasSecret ? (isSelectedItemSecretVisible ? (resolvedSecrets[selectedItemDetails.id] ?? '') : '••••••••••') : 'Aucun mot de passe enregistré pour cet élément.'}</p>
                      </div>
                      <div className="secret-action-stack">
                        {selectedItemDetails.hasSecret ? <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={toggleSelectedItemSecretVisibility} title={isSelectedItemSecretVisible ? 'Masquer' : 'Afficher'}><FieldIcon name={isSelectedItemSecretVisible ? 'eye-off' : 'eye'} /></button> : null}
                        {selectedItemDetails.hasSecret ? <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={() => handleSecretCopy(selectedItemDetails)} title="Copier le mot de passe"><FieldIcon name={copiedFieldKey === `secret-${selectedItemDetails.id}` ? 'check' : 'copy'} /></button> : null}
                      </div>
                    </div>
                    <CopyField label="Notes" value={selectedItemDetails.notes || 'Non renseigné'} fieldKey={`detail-notes-${selectedItemDetails.id}`} copiedFieldKey={copiedFieldKey} onCopy={() => handleCopyToClipboard(selectedItemDetails.notes || '', `detail-notes-${selectedItemDetails.id}`)} icon="name" />
                  </div>

                  <div className="vault-item-subsection">
                    <h4>URL associées</h4>
                    {(selectedItemDetails.uris ?? []).length === 0 ? <p>Aucune URL associée.</p> : (selectedItemDetails.uris ?? []).map((uri, index) => (
                      <div className="vault-item-detail-row" key={uri.id ?? `${uri.uri}-${index}`}>
                        <CopyField label={uri.label || 'URL'} value={uri.uri || 'Non renseignée'} fieldKey={`uri-${selectedItemDetails.id}-${index}`} copiedFieldKey={copiedFieldKey} onCopy={() => handleCopyToClipboard(uri.uri || '', `uri-${selectedItemDetails.id}-${index}`)} icon="name" />
                        <button className="button-link button-link-secondary vault-item-inline-action" type="button" onClick={() => window.open(uri.uri, '_blank', 'noopener,noreferrer')} disabled={!uri.uri}>Ouvrir</button>
                      </div>
                    ))}
                  </div>

                  <div className="vault-item-subsection">
                    <h4>Champs personnalisés</h4>
                    {(selectedItemDetails.customFields ?? []).length === 0 ? <p>Aucun champ personnalisé.</p> : (selectedItemDetails.customFields ?? []).map((field, index) => (
                      <CopyField key={field.id ?? `${field.label}-${index}`} label={`${field.label || 'Champ'} · ${formatFieldType(field.type)}`} value={field.value || 'Non renseigné'} fieldKey={`field-${selectedItemDetails.id}-${index}`} copiedFieldKey={copiedFieldKey} onCopy={() => handleCopyToClipboard(field.value || '', `field-${selectedItemDetails.id}-${index}`)} icon="name" />
                    ))}
                  </div>

                  <div className="vault-item-subsection">
                    <h4>Pièces jointes</h4>
                    {(selectedItemDetails.attachments ?? []).length === 0 ? <p>Aucune pièce jointe.</p> : (selectedItemDetails.attachments ?? []).map((attachment, index) => (
                      <div className="vault-item-detail-row" key={attachment.id ?? `${attachment.name}-${index}`}>
                        <CopyField label={attachment.name || 'Pièce jointe'} value={formatAttachmentMeta(attachment)} fieldKey={`attachment-${selectedItemDetails.id}-${index}`} copiedFieldKey={copiedFieldKey} onCopy={() => handleCopyToClipboard(attachment.name || '', `attachment-${selectedItemDetails.id}-${index}`)} icon="name" />
                        <button className="button-link button-link-secondary vault-item-inline-action" type="button" onClick={() => handleItemAttachmentDownload(attachment)}>Télécharger</button>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedItemDetails.access?.canDelete ? (
                  <div className="modal-section modal-section-danger">
                    <button className="button-link button-link-danger" type="button" onClick={handleSelectedItemDelete}>Supprimer l’élément</button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}

function formatRole(role) {
  if (role === 'OWNER') return 'Propriétaire'
  if (role === 'EDITOR') return 'Éditeur'
  return 'Lecteur'
}

function formatMemberDate(value) {
  if (!value) return 'Non renseigné'
  return formatDateTime(value)
}

function formatDateTime(value) {
  if (!value) return 'Non renseigné'
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatFieldType(type) {
  if (type === 'HIDDEN') return 'Masqué'
  if (type === 'BOOLEAN') return 'Booléen'
  if (type === 'NUMBER') return 'Nombre'
  return 'Texte'
}

function formatAttachmentMeta(attachment) {
  const size = typeof attachment?.size === 'number' ? `${Math.max(1, Math.round(attachment.size / 1024))} Ko` : 'Taille inconnue'
  return [attachment?.mimeType, size].filter(Boolean).join(' · ')
}

function readSecretUnlockError(error, fallbackMessage) {
  const message = error?.responseData?.message ?? error?.message ?? ''
  if (message.includes('PIN fourni est invalide')) {
    return 'Impossible d’afficher ce mot de passe pour le moment. Le code PIN est incorrect.'
  }
  return fallbackMessage
}

function CopyField({ label, value, fieldKey, copiedFieldKey, onCopy, icon, compact = false, fieldClass = '' }) {
  return (
    <div className={`vault-item-copy-field${compact ? ' vault-item-copy-field-compact' : ''}${fieldClass ? ` ${fieldClass}` : ''}`}>
      <div className="vault-item-copy-field-head">
        <FieldIcon name={icon} />
        {compact ? null : <span>{label}</span>}
      </div>
      <div className="vault-item-copy-field-body">
        <p>{value}</p>
      </div>
      <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={onCopy} title="Copier">
        <FieldIcon name={copiedFieldKey === fieldKey ? 'check' : 'copy'} />
      </button>
    </div>
  )
}

function FieldIcon({ name }) {
  if (name === 'name') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
  if (name === 'username') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 18.5c1.5-3 4-4.5 6.5-4.5s5 1.5 6.5 4.5" /></svg>
  if (name === 'globe') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4" /><path d="M12 3.8c2.5 2.2 4 5.1 4 8.2s-1.5 6-4 8.2c-2.5-2.2-4-5.1-4-8.2s1.5-6 4-8.2Z" /></svg>
  if (name === 'account') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 19c1.7-3 4.4-4.5 7.5-4.5s5.8 1.5 7.5 4.5" /></svg>
  if (name === 'members') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2.8" /><circle cx="16.5" cy="10.5" r="2.3" /><path d="M3.8 18c1.2-2.5 3.2-3.8 5.8-3.8 2.7 0 4.8 1.3 6 3.8" /><path d="M14.2 18c.7-1.5 1.9-2.3 3.4-2.3 1.1 0 2.1.4 3 1.3" /></svg>
  if (name === 'settings') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2.8" /><path d="M19.2 12a7.2 7.2 0 0 0-.1-1.2l2-1.6-2-3.4-2.5 1a7 7 0 0 0-2-.9L14.2 3h-4.4l-.4 2.9a7 7 0 0 0-2 .9l-2.5-1-2 3.4 2 1.6A7.2 7.2 0 0 0 4.8 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 2 .9l.4 2.9h4.4l.4-2.9a7 7 0 0 0 2-.9l2.5 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /></svg>
  if (name === 'link') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 14.5 14.5 9.5" /><path d="M7 17a3 3 0 0 1 0-4.2l2.2-2.2a3 3 0 1 1 4.2 4.2L11.2 17A3 3 0 1 1 7 17Z" /><path d="M17 7a3 3 0 0 1 0 4.2l-2.2 2.2a3 3 0 1 1-4.2-4.2L12.8 7A3 3 0 1 1 17 7Z" /></svg>
  if (name === 'secret') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="10" width="10" height="9" rx="2" /><path d="M9 10V8a3 3 0 0 1 6 0v2" /></svg>
  if (name === 'lock-closed') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="11" width="10" height="8" rx="2" /><path d="M9 11V8a3 3 0 0 1 6 0v3" /></svg>
  if (name === 'lock-open') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="11" width="10" height="8" rx="2" /><path d="M15 11V8a3 3 0 0 0-5.4-1.8" /></svg>
  if (name === 'eye') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  if (name === 'eye-off') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 6.4A10.3 10.3 0 0 1 12 6c6 0 9.5 6 9.5 6a16.9 16.9 0 0 1-3.2 3.8" /><path d="M6.2 6.7A16.7 16.7 0 0 0 2.5 12s3.5 6 9.5 6a10 10 0 0 0 2.3-.3" /></svg>
  if (name === 'copy') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="10" height="10" rx="2" /><rect x="5" y="5" width="10" height="10" rx="2" /></svg>
  if (name === 'check') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 9.5 17 19 7.5" /></svg>
  if (name === 'search') return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
  return null
}






