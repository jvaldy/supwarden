import { useEffect, useState } from 'react'
import { useAuth } from '../../context/authContext.js'

export function ProfilePage({ navigate = () => {} }) {
  const { authenticatedUser, updateProfile, deleteAccount } = useAuth()
  const [firstname, setFirstname] = useState(authenticatedUser?.firstname ?? '')
  const [lastname, setLastname] = useState(authenticatedUser?.lastname ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirmation, setNewPinConfirmation] = useState('')
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [pinError, setPinError] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [isPinSubmitting, setIsPinSubmitting] = useState(false)
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false)

  const canChangeExistingPassword = authenticatedUser?.hasLocalPassword !== false
  const hasPin = authenticatedUser?.hasPin === true

  useEffect(() => {
    // Réaligne le formulaire quand le profil est restauré ou mis à jour.
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

    if (newPin !== newPinConfirmation) {
      setPinError('Les codes PIN doivent être identiques.')
      return
    }

    setIsPinSubmitting(true)

    try {
      await updateProfile({
        newPin,
      })

      setNewPin('')
      setNewPinConfirmation('')
      setPinMessage(hasPin ? 'Votre code PIN a bien été modifié.' : 'Votre code PIN a bien été défini.')
    } catch (error) {
      setPinError(readFormError(error, 'Impossible de mettre à jour votre code PIN.'))
    } finally {
      setIsPinSubmitting(false)
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

    // Ajoute une dernière confirmation avant une suppression définitive.
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
        <p className="eyebrow">Profil</p>
        <h1 className="auth-title">Gérez vos informations personnelles et votre sécurité.</h1>
        <p className="lede">
          Mettez à jour votre identité et vos accès depuis un seul endroit,
          avec des confirmations claires pour les actions sensibles.
        </p>

        <div className="dashboard-summary profile-summary">
          <article className="status-card">
            <h2>Adresse e-mail actuelle</h2>
            <p>{authenticatedUser?.email}</p>
          </article>
          <article className="status-card">
            <h2>Statut</h2>
            <p>{authenticatedUser?.isActive ? 'Actif' : 'Inactif'}</p>
          </article>
        </div>

        <section className="profile-section">
          <div className="profile-section-header">
            <h2>Informations personnelles</h2>
            <p>Modifiez votre prénom et votre nom.</p>
          </div>

          <form className="auth-form profile-form" onSubmit={handleProfileSubmit}>
            <label className="field">
              <span>Prénom</span>
              <input onChange={(event) => setFirstname(event.target.value)} type="text" value={firstname} />
            </label>

            <label className="field">
              <span>Nom</span>
              <input onChange={(event) => setLastname(event.target.value)} type="text" value={lastname} />
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
            <h2>Sécurité</h2>
            <p>
              {canChangeExistingPassword
                ? 'Pour modifier votre mot de passe, indiquez toujours votre mot de passe actuel.'
                : 'Définissez un mot de passe local pour pouvoir aussi vous connecter sans passer par Google.'}
            </p>
          </div>

          <form className="auth-form profile-form" onSubmit={handlePasswordSubmit}>
            {canChangeExistingPassword ? (
              <label className="field profile-form-wide">
                <span>Mot de passe actuel</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
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
                type="password"
                value={newPassword}
              />
            </label>

            <label className="field profile-form-wide">
              <span>Confirmer le nouveau mot de passe</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
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
        </section>

        <section className="profile-section">
          <div className="profile-section-header">
            <h2>Code PIN</h2>
            <p>
              {hasPin
                ? 'Le code PIN sert aux validations rapides sur les actions sensibles.'
                : 'Définissez un code PIN pour sécuriser vos validations rapides.'}
            </p>
          </div>

          <form className="auth-form profile-form" onSubmit={handlePinSubmit}>
            <label className="field profile-form-wide">
              <span>Nouveau code PIN</span>
              <input
                inputMode="numeric"
                onChange={(event) => setNewPin(event.target.value)}
                pattern="[0-9]*"
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
                type="password"
                value={newPinConfirmation}
              />
            </label>

            {pinMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{pinMessage}</p> : null}
            {pinError ? <p className="field-feedback field-feedback-error profile-form-wide">{pinError}</p> : null}

            <button className="button-link button-link-primary auth-submit profile-form-wide" disabled={isPinSubmitting} type="submit">
              {isPinSubmitting
                ? hasPin
                  ? 'Modification en cours...'
                  : 'Définition en cours...'
                : hasPin
                  ? 'Modifier mon code PIN'
                  : 'Définir un code PIN'}
            </button>
          </form>
        </section>

        <section className="profile-section profile-section-danger">
          <div className="profile-section-header">
            <h2>Supprimer mon compte</h2>
            <p>Cette action est définitive. Une confirmation explicite sera demandée avant suppression.</p>
          </div>

          <form className="auth-form profile-form" onSubmit={handleDeleteSubmit}>
            <label className="field profile-form-wide">
              <span>Mot de passe actuel</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setDeleteCurrentPassword(event.target.value)}
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
    // Privilégie le premier message exploitable dans le formulaire.
    const firstFieldErrors = Object.values(validationErrors)[0]
    const firstMessage = Array.isArray(firstFieldErrors) ? firstFieldErrors[0] : null
    return firstMessage ?? error.responseData?.message ?? fallbackMessage
  }

  return error.responseData?.message ?? fallbackMessage
}
