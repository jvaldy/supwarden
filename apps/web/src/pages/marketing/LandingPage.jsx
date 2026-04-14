import supwardenLogoMark from '../../assets/supwarden-logo-mark.svg'
import { landingForces } from './content.js'

export function LandingPage({ navigate }) {
  return (
    <>
      <section className="hero-panel hero-panel-landing">
        <div className="hero-copy">
          <p className="eyebrow">Gestionnaire d’accès pour équipes</p>
          <h1 className="landing-title auth-title">Centralisez vos trousseaux et partagez les bons accès.</h1>
          <p className="lede">
            Supwarden rassemble les secrets, URL, notes et pièces jointes dans des trousseaux
            clairs. Vous gardez la main sur les permissions, que ce soit pour un usage personnel
            ou pour la collaboration d’équipe.
          </p>

          <div className="hero-actions">
            <button
              className="button-link button-link-primary button-link-cta"
              onClick={() => navigate('/dashboard')}
              type="button"
            >
              Ouvrir le dashboard
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
          <h2>Ce qui aide vraiment à gérer les accès au quotidien</h2>
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

