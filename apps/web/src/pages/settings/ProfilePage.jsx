import { useEffect, useState } from 'react'
import { useAuth } from '../../context/authContext.js'

export function ProfilePage({ navigate = () => {} }) {
  const { authenticatedUser, updateProfile, deleteAccount } = useAuth()
  const [firstname, setFirstname] = useState(authenticatedUser?.firstname ?? '')
  const [lastname, setLastname] = useState(authenticatedUser?.lastname ?? '')
  const [email, setEmail] = useState(authenticatedUser?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false)

  useEffect(() => {
    // Réaligne le formulaire quand le profil est restauré ou mis à jour.
    setFirstname(authenticatedUser?.firstname ?? '')
    setLastname(authenticatedUser?.lastname ?? '')
    setEmail(authenticatedUser?.email ?? '')
  }, [authenticatedUser?.email, authenticatedUser?.firstname, authenticatedUser?.lastname])

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setProfileMessage('')
    setProfileError('')
    setIsProfileSubmitting(true)

    try {
      await updateProfile({
        firstname,
        lastname,
        email,
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
    setIsPasswordSubmitting(true)

    try {
      await updateProfile({
        currentPassword,
        newPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage('Votre mot de passe a bien été modifié.')
    } catch (error) {
      setPasswordError(readFormError(error, 'Impossible de modifier votre mot de passe.'))
    } finally {
      setIsPasswordSubmitting(false)
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
          Mettez à jour votre identité, votre adresse e-mail et vos accès depuis un seul endroit,
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
            <p>Modifiez votre prénom, votre nom et votre adresse e-mail.</p>
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

            <label className="field profile-form-wide">
              <span>Adresse e-mail</span>
              <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
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
            <p>Pour modifier votre mot de passe, indiquez toujours votre mot de passe actuel.</p>
          </div>

          <form className="auth-form profile-form" onSubmit={handlePasswordSubmit}>
            <label className="field profile-form-wide">
              <span>Mot de passe actuel</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </label>

            <label className="field profile-form-wide">
              <span>Nouveau mot de passe</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>

            {passwordMessage ? <p className="field-feedback field-feedback-success profile-form-wide">{passwordMessage}</p> : null}
            {passwordError ? <p className="field-feedback field-feedback-error profile-form-wide">{passwordError}</p> : null}

            <button className="button-link button-link-primary auth-submit profile-form-wide" disabled={isPasswordSubmitting} type="submit">
              {isPasswordSubmitting ? 'Modification en cours...' : 'Modifier mon mot de passe'}
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
