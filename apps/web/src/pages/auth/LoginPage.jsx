export function LoginPage({ navigate }) {
  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/dashboard')
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
            <input placeholder="vous@entreprise.fr" type="email" />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input placeholder="Votre mot de passe" type="password" />
          </label>

          <button className="button-link button-link-primary auth-submit" type="submit">
            Se connecter
          </button>
        </form>

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
