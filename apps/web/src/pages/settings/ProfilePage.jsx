import { useEffect, useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import {
  getSecretMaskTimeoutOptions,
  getSecretMaskTimeoutSeconds,
  setSecretMaskTimeoutSeconds,
} from '../../services/storage/secretVisibilityStorage.js'

export function ProfilePage({ navigate = () => {} }) {
  const { authenticatedUser, updateProfile, deleteAccount } = useAuth()
  const [firstname, setFirstname] = useState(authenticatedUser?.firstname ?? '')
  const [lastname, setLastname] = useState(authenticatedUser?.lastname ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [pinCurrentPassword, setPinCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirmation, setNewPinConfirmation] = useState('')
  const [secretMaskTimeoutSeconds, setSecretMaskTimeoutSecondsState] = useState(() => getSecretMaskTimeoutSeconds())
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [pinError, setPinError] = useState('')
  const [timeoutMessage, setTimeoutMessage] = useState('')
  const [timeoutError, setTimeoutError] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [isPinSubmitting, setIsPinSubmitting] = useState(false)
  const [isTimeoutSubmitting, setIsTimeoutSubmitting] = useState(false)
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false)

  const canChangeExistingPassword = authenticatedUser?.hasLocalPassword !== false
  const hasPin = authenticatedUser?.hasPin === true
  const secretMaskTimeoutOptions = getSecretMaskTimeoutOptions()

  useEffect(() => {
    setFirstname(authenticatedUser?.firstname ?? '')
    setLastname(authenticatedUser?.lastname ?? '')
  }, [authenticatedUser?.firstname, authenticatedUser?.lastname])

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setProfileMessage('')
    setProfileError('')
    setIsProfileSubmitting(true)

    try {
      await updateProfile({
        firstname,
        lastname,
      })

      setProfileMessage('Vos informations ont bien été mises à jour.')
    } catch (error) {
      setProfileError(readFormError(error, 'Impossible de mettre à jour vos informations.'))
    } finally {
      setIsProfileSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Les nouveaux mots de passe doivent être identiques.')
      return
    }

    setIsPasswordSubmitting(true)

    try {
      const passwordPayload = canChangeExistingPassword
        ? {
            currentPassword,
            newPassword,
          }
        : {
            newPassword,
          }

      await updateProfile(passwordPayload)

      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      setPasswordMessage(
        canChangeExistingPassword
          ? 'Votre mot de passe a bien été modifié.'
          : 'Votre mot de passe local a bien été défini.'
      )
    } catch (error) {
      setPasswordError(readFormError(error, 'Impossible de modifier votre mot de passe.'))
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

  async function handlePinSubmit(event) {
    event.preventDefault()
    setPinMessage('')
    setPinError('')
    setTimeoutMessage('')
    setTimeoutError('')

    const isPinChangeRequested = newPin !== '' || newPinConfirmation !== ''
    if (isPinChangeRequested && newPin !== newPinConfirmation) {
      setPinError('Les codes PIN doivent être identiques.')
      return
    }

    if (!isPinChangeRequested) {
      setPinMessage('Aucun nouveau code PIN à enregistrer pour le moment.')
      return
    }

    if (hasPin && pinCurrentPassword.trim() === '') {
      setPinError('Renseignez votre mot de passe actuel pour modifier le code PIN.')
      return
    }

    setIsPinSubmitting(true)

    try {
      await updateProfile({
        pinCurrentPassword: hasPin ? pinCurrentPassword : undefined,
        newPin,
      })

      setPinCurrentPassword('')
      setNewPin('')
      setNewPinConfirmation('')
      setPinMessage(hasPin ? 'Votre code PIN a bien été modifié.' : 'Votre code PIN a bien été défini.')
    } catch (error) {
      setPinError(readFormError(error, 'Impossible de mettre à jour votre code PIN.'))
    } finally {
      setIsPinSubmitting(false)
    }
  }

  function handleTimeoutChange(event) {
    setSecretMaskTimeoutSecondsState(Number(event.target.value))
    setTimeoutMessage('')
    setTimeoutError('')
  }

  async function handleTimeoutSubmit(event) {
    event.preventDefault()
    setTimeoutMessage('')
    setTimeoutError('')
    setPinMessage('')
    setPinError('')

    const currentTimeoutSeconds = getSecretMaskTimeoutSeconds()
    const isTimeoutChanged = Number(secretMaskTimeoutSeconds) !== currentTimeoutSeconds

    if (!isTimeoutChanged) {
      setTimeoutMessage('Le délai est déjà réglé sur cette durée.')
      return
    }

    setIsTimeoutSubmitting(true)

    try {
      const savedTimeout = setSecretMaskTimeoutSeconds(secretMaskTimeoutSeconds)
      setSecretMaskTimeoutSecondsState(savedTimeout)
      setTimeoutMessage('Le délai de re-masquage a bien été mis à jour.')
    } catch {
      setTimeoutError('Impossible de mettre à jour ce délai pour le moment.')
    } finally {
      setIsTimeoutSubmitting(false)
    }
  }

  async function handleDeleteSubmit(event) {
    event.preventDefault()
    setDeleteMessage('')
    setDeleteError('')

    if (!deleteConfirmation) {
      setDeleteError('Veuillez confirmer la suppression de votre compte.')
      return
    }

    const userConfirmedDeletion = window.confirm(
      'Confirmez-vous la suppression définitive de votre compte Supwarden ?'
    )

    if (!userConfirmedDeletion) {
      return
    }

    setIsDeleteSubmitting(true)

    try {
      await deleteAccount({
        currentPassword: deleteCurrentPassword,
        confirmDeletion: true,
      })

      setDeleteMessage('Votre compte a bien été supprimé.')
      navigate('/')
    } catch (error) {
      setDeleteError(readFormError(error, 'Impossible de supprimer votre compte.'))
    } finally {
      setIsDeleteSubmitting(false)
    }
  }

  return (
    <section className="auth-shell">
      <article className="auth-card profile-card">
        <div className="profile-header">
          <p className="eyebrow">Profil</p>
          <h1 className="dashboard-title">Gérez vos informations personnelles.</h1>
          <p className="lede">Mettez à jour informations sensibles.</p>
        </div>

        <div className="profile-meta-strip" aria-label="informations du compte">
          <span className="profile-meta-chip">
            <span className="vault-meta-label">Adresse e-mail</span>
            <strong>{authenticatedUser?.email}</strong>
          </span>
          <span className="profile-meta-chip">
            <span className="vault-meta-label">Statut</span>
            <strong>{authenticatedUser?.isActive ? 'Actif' : 'Inactif'}</strong>
          </span>
          <span className="profile-meta-chip">
            <span className="vault-meta-label">Compte créé le</span>
            <strong>{formatProfileDate(authenticatedUser?.createdAt)}</strong>
          </span>
        </div>

        <section className="profile-section">
          <div className="profile-section-header">
            <div className="profile-section-heading">
              <h2>Informations personnelles</h2>
              <InfoHint text="Modifiez votre prénom et votre nom." />
            </div>
          </div>

          <form className="auth-form profile-form" onSubmit={handleProfileSubmit}>
            <label className="field">
              <span>Prénom</span>
              <input onChange={(event) => setFirstname(event.target.value)} placeholder="Votre prénom" type="text" value={firstname} />
            </label>

            <label className="field">
              <span>Nom</span>
              <input onChange={(event) => setLastname(event.target.value)} placeholder="Votre nom" type="text" value={lastname} />
            </label>

            {profileMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{profileMessage}</p> : null}
            {profileError ? <p className="field-feedback field-feedback-error profile-form-wide">{profileError}</p> : null}

            <button className="button-link button-link-primary auth-submit profile-form-wide" disabled={isProfileSubmitting} type="submit">
              {isProfileSubmitting ? 'Mise à jour en cours...' : 'Enregistrer mes informations'}
            </button>
          </form>
        </section>

        <section className="profile-section">
          <div className="profile-section-header">
            <div className="profile-section-heading">
              <h2>Sécurité</h2>
              <InfoHint
                text={
                  hasPin
                    ? 'Le code PIN sert au déverrouillage temporaire des secrets. Sa modification demande aussi votre mot de passe actuel.'
                    : 'Définissez votre code PIN puis ajustez le délai de re-masquage et votre mot de passe depuis le même espace.'
                }
              />
            </div>
          </div>

          <div className="profile-security-stack">
            <div className="profile-security-block">
              <div className="profile-section-heading">
                <h3>Code PIN</h3>
                <InfoHint
                  text={
                    hasPin
                      ? 'Pour modifier votre code PIN, confirmez aussi le mot de passe actuel du compte.'
                      : 'Définissez un code PIN pour protéger l’affichage des mots de passe sensibles.'
                  }
                />
              </div>

              <form className="auth-form profile-form" onSubmit={handlePinSubmit}>
                {hasPin ? (
                  <label className="field profile-form-wide">
                    <span>Mot de passe actuel du compte</span>
                    <input
                      autoComplete="current-password"
                      onChange={(event) => setPinCurrentPassword(event.target.value)}
                      placeholder="Mot de passe actuel"
                      type="password"
                      value={pinCurrentPassword}
                    />
                  </label>
                ) : null}

                <label className="field profile-form-wide">
                  <span>Nouveau code PIN</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) => setNewPin(event.target.value)}
                    pattern="[0-9]*"
                    placeholder="4 à 6 chiffres"
                    type="password"
                    value={newPin}
                  />
                </label>

                <label className="field profile-form-wide">
                  <span>Confirmer le nouveau code PIN</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) => setNewPinConfirmation(event.target.value)}
                    pattern="[0-9]*"
                    placeholder="Répétez le même code PIN"
                    type="password"
                    value={newPinConfirmation}
                  />
                </label>
                {pinMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{pinMessage}</p> : null}
                {pinError ? <p className="field-feedback field-feedback-error profile-form-wide">{pinError}</p> : null}

                <div className="profile-security-actions profile-form-wide">
                  <button className="button-link button-link-primary auth-submit" disabled={isPinSubmitting} type="submit">
                    {isPinSubmitting
                      ? hasPin
                        ? 'Modification en cours...'
                        : 'Définition en cours...'
                      : hasPin
                        ? 'Modifier mon code PIN'
                        : 'Définir un code PIN'}
                  </button>
                </div>
              </form>

              <form className="auth-form profile-form" onSubmit={handleTimeoutSubmit}>
                <label className="field profile-form-wide">
                  <span>Délai de re-masquage des secrets</span>
                  <select onChange={handleTimeoutChange} value={secretMaskTimeoutSeconds}>
                    {secretMaskTimeoutOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {timeoutMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{timeoutMessage}</p> : null}
                {timeoutError ? <p className="field-feedback field-feedback-error profile-form-wide">{timeoutError}</p> : null}

                <div className="profile-security-actions profile-form-wide">
                  <button className="button-link button-link-primary auth-submit" disabled={isTimeoutSubmitting} type="submit">
                    {isTimeoutSubmitting ? 'Mise à jour en cours...' : 'Mettre à jour le délai'}
                  </button>
                </div>
              </form>
            </div>

            <div className="profile-security-block">
              <div className="profile-section-heading">
                <h3>Mot de passe</h3>
                <InfoHint
                  text={
                    canChangeExistingPassword
                      ? 'Pour modifier votre mot de passe, indiquez toujours votre mot de passe actuel.'
                      : 'Définissez un mot de passe local pour pouvoir aussi vous connecter sans passer par Google.'
                  }
                />
              </div>

              <form className="auth-form profile-form" onSubmit={handlePasswordSubmit}>
                {canChangeExistingPassword ? (
                  <label className="field profile-form-wide">
                    <span>Mot de passe actuel</span>
                    <input
                      autoComplete="current-password"
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Mot de passe actuel"
                      type="password"
                      value={currentPassword}
                    />
                  </label>
                ) : null}

                <label className="field profile-form-wide">
                  <span>Nouveau mot de passe</span>
                  <input
                    autoComplete="new-password"
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Nouveau mot de passe"
                    type="password"
                    value={newPassword}
                  />
                </label>

                <label className="field profile-form-wide">
                  <span>Confirmer le nouveau mot de passe</span>
                  <input
                    autoComplete="new-password"
                    onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                    placeholder="Confirmez le nouveau mot de passe"
                    type="password"
                    value={newPasswordConfirmation}
                  />
                </label>

                {passwordMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{passwordMessage}</p> : null}
                {passwordError ? <p className="field-feedback field-feedback-error profile-form-wide">{passwordError}</p> : null}

                <button className="button-link button-link-primary auth-submit profile-form-wide" disabled={isPasswordSubmitting} type="submit">
                  {isPasswordSubmitting
                    ? canChangeExistingPassword
                      ? 'Modification en cours...'
                      : 'Définition en cours...'
                    : canChangeExistingPassword
                      ? 'Modifier mon mot de passe'
                      : 'Définir un mot de passe'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="profile-section profile-section-danger">
          <div className="profile-section-header">
            <div className="profile-section-heading">
              <h2>Supprimer mon compte</h2>
              <InfoHint text="Cette action est définitive. Une confirmation explicite sera demandée avant suppression." />
            </div>
          </div>

          <form className="auth-form profile-form" onSubmit={handleDeleteSubmit}>
            <label className="field profile-form-wide">
              <span>Mot de passe actuel</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setDeleteCurrentPassword(event.target.value)}
                placeholder="Mot de passe actuel"
                type="password"
                value={deleteCurrentPassword}
              />
            </label>

            <label className="field-checkbox profile-form-wide">
              <input
                checked={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.checked)}
                type="checkbox"
              />
              <span>Je confirme vouloir supprimer définitivement mon compte.</span>
            </label>

            {deleteMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{deleteMessage}</p> : null}
            {deleteError ? <p className="field-feedback field-feedback-error profile-form-wide">{deleteError}</p> : null}

            <button className="button-link button-link-danger auth-submit profile-form-wide" disabled={isDeleteSubmitting} type="submit">
              {isDeleteSubmitting ? 'Suppression en cours...' : 'Supprimer mon compte'}
            </button>
          </form>
        </section>
      </article>
    </section>
  )
}

function readFormError(error, fallbackMessage) {
  const validationErrors = error.responseData?.errors

  if (validationErrors && typeof validationErrors === 'object') {
    const firstFieldErrors = Object.values(validationErrors)[0]
    const firstMessage = Array.isArray(firstFieldErrors) ? firstFieldErrors[0] : null
    return firstMessage ?? error.responseData?.message ?? fallbackMessage
  }

  return error.responseData?.message ?? fallbackMessage
}

function formatProfileDate(dateValue) {
  if (!dateValue) {
    return 'Indisponible'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function InfoHint({ text }) {
  return (
    <span className="profile-info-hint">
      <button aria-label={text} className="profile-info-trigger" type="button">
        i
      </button>
      <span className="profile-info-tooltip" role="note">
        {text}
      </span>
    </span>
  )
}
