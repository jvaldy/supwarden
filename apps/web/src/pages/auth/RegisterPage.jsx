import { useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { redirectToGoogleOAuth } from '../../services/authApi.js'

export function RegisterPage({ navigate }) {
  const { register } = useAuth()
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Valide le formulaire minimum avant de déléguer la création du compte à l'API.
  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    // Évite un appel API inutile si la confirmation ne correspond pas.
    if (password !== passwordConfirmation) {
      setFormError('Les mots de passe doivent être identiques.')
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        email,
        firstname,
        lastname,
        password,
      })

      navigate('/dashboard')
    } catch (error) {
      const validationErrors = error.responseData?.errors

      if (validationErrors && typeof validationErrors === 'object') {
        const firstFieldErrors = Object.values(validationErrors)[0]
        const firstMessage = Array.isArray(firstFieldErrors) ? firstFieldErrors[0] : null
        setFormError(firstMessage ?? error.responseData?.message ?? 'Inscription impossible pour le moment.')
      } else {
        setFormError(error.responseData?.message ?? 'Inscription impossible pour le moment.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Réutilise le même point d'entrée Google que la page de connexion.
  function handleGoogleRegister() {
    redirectToGoogleOAuth()
  }

  return (
    <section className="auth-shell">
      <article className="auth-card">
        <p className="eyebrow">Inscription</p>
        <h1 className="auth-title">Créez votre espace Supwarden.</h1>
        <p className="lede">
          Créez un compte pour obtenir un trousseau personnel, rejoindre des espaces partagés et
          commencer à administrer vos secrets.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Prénom</span>
            <input
              autoComplete="given-name"
              onChange={(event) => setFirstname(event.target.value)}
              placeholder="Ex. Camille"
              type="text"
              value={firstname}
            />
          </label>

          <label className="field">
            <span>Nom</span>
            <input
              autoComplete="family-name"
              onChange={(event) => setLastname(event.target.value)}
              placeholder="Ex. Martin"
              type="text"
              value={lastname}
            />
          </label>

          <label className="field">
            <span>Adresse e-mail</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@entreprise.fr"
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe"
              type="password"
              value={password}
            />
          </label>

          <label className="field">
            <span>Confirmer le mot de passe</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Confirmer le mot de passe"
              type="password"
              value={passwordConfirmation}
            />
          </label>

          {formError ? <p className="field-feedback field-feedback-error">{formError}</p> : null}

          <button className="button-link button-link-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <button className="button-link button-link-secondary auth-submit" onClick={handleGoogleRegister} type="button">
          S'inscrire avec Google
        </button>

        <div className="auth-actions">
          <button className="button-link button-link-ghost" onClick={() => navigate('/connexion')} type="button">
            J'ai déjà un compte
          </button>
          <button className="button-link button-link-ghost" onClick={() => navigate('/')} type="button">
            Retour à l'accueil
          </button>
        </div>
      </article>
    </section>
  )
}
