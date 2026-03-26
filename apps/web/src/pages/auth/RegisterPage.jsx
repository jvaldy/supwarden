export function RegisterPage({ navigate }) {
  return (
    <section className="auth-shell">
      <article className="auth-card">
        <p className="eyebrow">Inscription</p>
        <h1 className="auth-title">Créez votre espace Supwarden.</h1>
        <p className="lede">
          Créez un compte pour obtenir un trousseau personnel, rejoindre des espaces partagés et
          commencer à administrer vos secrets.
        </p>

        <form className="auth-form">
          <label className="field">
            <span>Nom complet</span>
            <input placeholder="Ex. Camille Martin" type="text" />
          </label>

          <label className="field">
            <span>Adresse e-mail</span>
            <input placeholder="vous@entreprise.fr" type="email" />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input placeholder="Votre mot de passe" type="password" />
          </label>

          <label className="field">
            <span>Confirmer le mot de passe</span>
            <input placeholder="Confirmer le mot de passe" type="password" />
          </label>

          <button className="button-link button-link-primary auth-submit" type="submit">
            Créer mon compte
          </button>
        </form>

        <div className="auth-actions">
          <button className="button-link button-link-ghost" onClick={() => navigate('/connexion')} type="button">
            J’ai déjà un compte
          </button>
          <button className="button-link button-link-ghost" onClick={() => navigate('/')} type="button">
            Retour à l’accueil
          </button>
        </div>
      </article>
    </section>
  )
}
