import {
  buttonExamples,
  colorGroups,
  experiencePillars,
  principles,
  statusCards,
  tableRows,
  userSignals,
} from './content.js'
import supwardenLogoMark from '../../assets/supwarden-logo-mark.svg'

export function BrandPage() {
  return (
    <section className="brand-page">
      <section className="hero-panel brand-hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Charte graphique Supwarden</p>
          <h1 className="brand-title">
            Une identité plus fluide, plus crédible et plus utile pour l’utilisateur final.
          </h1>
          <p className="lede">
            La charte ne sert pas seulement à définir des couleurs. Elle garantit une expérience plus
            rassurante, plus lisible et plus professionnelle à chaque étape du parcours.
          </p>

          <div className="hero-actions">
            <span className="badge badge-info">Parcours plus clair</span>
            <span className="badge badge-success">Interface plus crédible</span>
            <span className="badge badge-warning">Décision plus rapide</span>
          </div>
        </div>

        <aside className="hero-side brand-hero-side">
          <p className="panel-label">Repère visuel</p>
          <div className="hero-logo-stage">
            <img className="hero-logo" src={supwardenLogoMark} alt="Logo Supwarden" />
          </div>
          <ul className="principles-list">
            {principles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="brand-signals" aria-label="impact de la charte">
        {userSignals.map((item) => (
          <article className="metric-card" key={item.value}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </section>

      <section className="showcase-grid" aria-label="elements de la charte">
        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Expérience</p>
            <h2>Ce que la charte doit changer pour l’utilisateur</h2>
          </div>

          <div className="highlights-grid brand-pillars-grid">
            {experiencePillars.map((item) => (
              <article className="highlight-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Palette</p>
            <h2>Des couleurs qui rassurent sans en faire trop</h2>
          </div>

          <div className="palette-groups">
            {colorGroups.map((group) => (
              <div key={group.title} className="palette-group">
                <h3>{group.title}</h3>
                <div className="swatch-grid">
                  {group.items.map((item) => (
                    <article className="swatch-card" key={item.name}>
                      <div className="swatch" style={{ background: item.value }} aria-hidden="true" />
                      <strong>{item.name}</strong>
                      <code>{item.value}</code>
                      <span>{item.role}</span>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Typographie</p>
            <h2>Une lecture plus simple et plus sûre</h2>
          </div>

          <div className="type-specimen">
            <p className="type-overline">Sora pour les titres</p>
            <p className="type-display">Accéder, partager, vérifier sans hésiter.</p>
            <p className="type-body-large">
              Inter rend les pages plus fluides à lire et aide l’utilisateur à comprendre plus vite.
            </p>
            <p className="type-body">
              La bonne hiérarchie éditoriale réduit la fatigue visuelle et rend les actions évidentes.
            </p>
            <code>JetBrains Mono pour les identifiants, les valeurs et les données techniques</code>
          </div>
        </article>

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Actions</p>
            <h2>Des interactions plus claires</h2>
          </div>

          <div className="button-stack">
            {buttonExamples.map((item) => (
              <button key={item.label} className={item.className} type="button">
                {item.label}
              </button>
            ))}
          </div>

          <div className="badge-row">
            <span className="badge badge-info">Information</span>
            <span className="badge badge-success">Confirmation</span>
            <span className="badge badge-warning">Vérification</span>
            <span className="badge badge-danger">Critique</span>
          </div>
        </article>

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Formulaires</p>
            <h2>Moins de friction, plus de confiance</h2>
          </div>

          <form className="form-demo">
            <label className="field">
              <span>Nom du trousseau</span>
              <input defaultValue="Équipe produit" type="text" />
            </label>

            <label className="field">
              <span>Rôle d’accès</span>
              <select defaultValue="admin">
                <option value="reader">Lecteur</option>
                <option value="editor">Éditeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>

            <p className="field-help">
              Des libellés simples et des aides courtes rendent les actions plus évidentes.
            </p>
            <p className="field-feedback field-feedback-success">
              La validation doit rassurer, pas interrompre.
            </p>
          </form>
        </article>

        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Parcours</p>
            <h2>Une expérience plus professionnelle d’un écran à l’autre</h2>
          </div>

          <div className="status-grid">
            {statusCards.map((item) => (
              <article className="status-card" key={item.label}>
                <h3>{item.label}</h3>
                <p>{item.value}</p>
              </article>
            ))}
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>Rôle dans le parcours</th>
                  <th>Exemple concret</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.pattern}>
                    <td>{row.pattern}</td>
                    <td>{row.usage}</td>
                    <td>{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </section>
  )
}
