import supwardenLogoMark from '../../assets/supwarden-logo-mark.svg'
import { landingForces } from './content.js'

export function LandingPage({ navigate }) {
  return (
    <>
      <section className="hero-panel hero-panel-landing">
        <div className="hero-copy">
          <p className="eyebrow">Gestionnaire de trousseaux collaboratif</p>
          <h1 className="landing-title auth-title">Simplifiez le partage des accès dans votre équipe.</h1>
          <p className="lede">
            Supwarden centralise les identifiants, mots de passe, URIs, notes et champs personnalisés
            dans des trousseaux personnels ou partagés, avec un cadre pensé pour la collaboration
            interne.
          </p>

          <div className="hero-actions">
            <button
              className="button-link button-link-primary button-link-cta"
              onClick={() => navigate('/dashboard')}
              type="button"
            >
              Découvrir
            </button>
          </div>
        </div>

        <div className="hero-side hero-side-filled">
          <div className="hero-logo-stage">
            <img className="hero-logo" src={supwardenLogoMark} alt="Logo Supwarden" />
          </div>
        </div>
      </section>

      <section className="highlights-panel" aria-label="forces de l’outil" id="forces-outil">
        <div className="section-heading">
          <p className="panel-label">Forces de l’outil</p>
          <h2>L’essentiel pour gérer les accès sans complexité inutile</h2>
        </div>

        <ul className="highlights-grid">
          {landingForces.map((item) => (
            <li className="highlight-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
