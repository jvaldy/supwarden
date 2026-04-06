import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/authContext.js'

export function OAuthCallbackPage({ navigate }) {
  const { completeOAuthSession, confirmOAuthRegistration } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Déplie les paramètres du retour OAuth pour piloter les trois cas possibles.
  const callbackState = useMemo(() => {
    const hashParameters = new URLSearchParams(window.location.hash.replace(/^#/, ''))

    return {
      token: hashParameters.get('token'),
      error: hashParameters.get('error'),
      status: hashParameters.get('status'),
      email: hashParameters.get('email'),
      firstname: hashParameters.get('firstname'),
      lastname: hashParameters.get('lastname'),
      hasLocalAccount: hashParameters.get('hasLocalAccount') === '1',
    }
  }, [])

  useEffect(() => {
    if (!callbackState.token) {
      return
    }

    completeOAuthSession(callbackState.token)
    navigate('/dashboard')
  }, [callbackState.token, completeOAuthSession, navigate])

  if (callbackState.token) {
    return null
  }

  if (callbackState.error) {
    return (
      <section className="auth-shell">
        <article className="auth-card">
          <p className="eyebrow">Connexion</p>
          <h1 className="auth-title">Connexion Google interrompue.</h1>
          <p className="field-feedback field-feedback-error">{callbackState.error}</p>
          <div className="auth-actions">
            <button className="button-link button-link-ghost" onClick={() => navigate('/connexion')} type="button">
              Retour à la connexion
            </button>
          </div>
        </article>
      </section>
    )
  }

  // Finalise la création ou la liaison du compte local après accord explicite.
  async function handleConfirmation() {
    setFormError('')
    setIsSubmitting(true)

    try {
      await confirmOAuthRegistration()
      navigate('/dashboard')
    } catch (error) {
      setFormError(error.responseData?.message ?? 'Confirmation impossible pour le moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Laisse l'utilisateur quitter le flux sans créer ni lier de compte.
  function handleCancellation() {
    navigate('/connexion')
  }

  return (
    <section className="auth-shell">
      <article className="auth-card">
        <p className="eyebrow">Connexion Google</p>
        <h1 className="auth-title">Confirmez l’utilisation de votre compte Google.</h1>
        <p className="lede">
          {callbackState.hasLocalAccount
            ? 'Un compte Supwarden existe déjà avec cette adresse e-mail. Nous avons besoin de votre accord pour le relier à Google.'
            : 'Aucun compte Supwarden n’est encore lié à cette adresse. Nous avons besoin de votre accord avant de créer votre compte local.'}
        </p>

        <div className="status-card">
          <h3>Compte détecté</h3>
          <p>{[callbackState.firstname, callbackState.lastname].filter(Boolean).join(' ') || callbackState.email}</p>
          {callbackState.email ? <p>{callbackState.email}</p> : null}
        </div>

        {formError ? <p className="field-feedback field-feedback-error">{formError}</p> : null}

        <div className="auth-actions">
          <button className="button-link button-link-primary" disabled={isSubmitting} onClick={handleConfirmation} type="button">
            {isSubmitting ? 'Confirmation en cours...' : 'Autoriser et continuer'}
          </button>
          <button className="button-link button-link-tertiary" onClick={handleCancellation} type="button">
            Annuler
          </button>
        </div>
      </article>
    </section>
  )
}
