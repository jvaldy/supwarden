import { useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { redirectToGoogleOAuth } from '../../services/api/authApi.js'

export function LoginPage({ navigate }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      await login({
        email,
        password,
      })

      navigate('/dashboard')
    } catch (error) {
      if (error?.responseData?.message) {
        setFormError(error.responseData.message)
        return
      }

      if (error?.status === 401) {
        setFormError('Identifiants invalides.')
        return
      }

      setFormError('Connexion impossible pour le moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleLogin() {
    redirectToGoogleOAuth()
  }

  return (
    <section className="auth-shell">
      <article className="auth-card">
        <p className="eyebrow">Connexion</p>
        <h1 className="auth-title">Retrouvez vos trousseaux en quelques secondes.</h1>
        <p className="lede">
          Connectez-vous pour accéder au tableau de bord, à vos trousseaux et aux espaces
          collaboratifs de votre équipe.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe"
              type="password"
              value={password}
            />
          </label>

          {formError ? <p className="field-feedback field-feedback-error">{formError}</p> : null}

          <button className="button-link button-link-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <button className="button-link button-link-secondary auth-submit" onClick={handleGoogleLogin} type="button">
          Se connecter avec Google
        </button>

        <div className="auth-actions">
          <button className="button-link button-link-ghost" onClick={() => navigate('/inscription')} type="button">
            Je n'ai pas encore de compte
          </button>
          <button className="button-link button-link-ghost" onClick={() => navigate('/')} type="button">
            Retour à l'accueil
          </button>
        </div>
      </article>
    </section>
  )
}
