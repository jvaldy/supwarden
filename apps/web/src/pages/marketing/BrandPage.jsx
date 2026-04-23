import { colorGroups, principles, spacingRules, typographyScale, mobileRules } from './content.js'
import supwardenLogoMark from '../../assets/supwarden-logo-mark.svg'

export function BrandPage() {
  const coreTypography = typographyScale.filter((item) => (
    item.token === '--step-0' || item.token === '--step-1' || item.token === '--step-2' || item.token === '--step-3'
  ))

  return (
    <section className="brand-page">
      <section className="hero-panel brand-hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Système visuel Supwarden</p>
          <h1 className="brand-title">Des règles simples pour une interface cohérente.</h1>
          <p className="lede">Référence interne pour garder les mêmes repères sur le dashboard, les trousseaux et les écrans de compte.</p>
          <ul className="principles-list">
            {principles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <aside className="hero-side brand-hero-side">
          <p className="panel-label">Repère visuel</p>
          <div className="hero-logo-stage">
            <img className="hero-logo" src={supwardenLogoMark} alt="Logo Supwarden" />
          </div>
        </aside>
      </section>

      <section className="showcase-grid" aria-label="éléments essentiels de la charte">
        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Palette</p>
            <h2>Couleurs utilisées dans le produit</h2>
            <p className="lede compact">Palette appliquée aux actions, états de sécurité et zones de travail.</p>
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
            <h2>Lecture prioritaire sur les actions</h2>
          </div>

          <div className="type-specimen">
            <p className="type-overline">Police interface: Arial / Helvetica</p>
            <p className="type-display">Titres courts, contenu lisible, actions visibles.</p>
            <p className="type-body">Même hiérarchie de texte sur tout le parcours applicatif.</p>
            <code>JetBrains Mono: réservé aux informations techniques</code>
          </div>

          <div className="type-scale-list" aria-label="échelle typographique principale">
            {coreTypography.map((item) => (
              <article className="type-scale-card" key={item.token}>
                <div className="type-scale-top">
                  <strong>{item.label}</strong>
                  <code>{item.value}</code>
                </div>
                <p>{item.usage}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Espacements</p>
            <h2>Rythme constant des formulaires aux modales</h2>
          </div>

          <div className="type-scale-list" aria-label="règles d’espacement">
            {spacingRules.map((item) => (
              <article className="type-scale-card" key={item.title}>
                <div className="type-scale-top">
                  <strong>{item.title}</strong>
                  <code>{item.value}</code>
                </div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <ul className="brand-quick-list" aria-label="règles mobile">
            {mobileRules.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Boutons utilisés</p>
            <h2>Styles d’action disponibles</h2>
            <p className="lede compact">Choisir selon la priorité métier de l’action.</p>
          </div>

          <div className="brand-button-grid">
            <button className="button-link button-link-primary" type="button">Primary</button>
            <button className="button-link button-link-secondary" type="button">Secondary</button>
            <button className="button-link button-link-tertiary" type="button">Tertiary</button>
            <button className="button-link button-link-ghost" type="button">Ghost</button>
            <button className="button-link button-link-danger" type="button">Danger</button>
            <button className="button-link button-link-primary button-link-cta" type="button">CTA</button>
            <button className="button-link button-link-primary" disabled type="button">Disabled</button>
          </div>
        </article>

        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Champs utilisés</p>
            <h2>Référentiel des entrées standard</h2>
            <p className="lede compact">Même présentation pour garder une saisie prévisible.</p>
          </div>

          <form className="form-demo" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>Texte</span>
              <input type="text" placeholder="Ex. Équipe Produit" />
            </label>

            <label className="field">
              <span>Email</span>
              <input type="email" placeholder="vous@entreprise.fr" />
            </label>

            <label className="field">
              <span>Mot de passe</span>
              <input type="password" placeholder="Votre mot de passe" />
            </label>

            <label className="field">
              <span>Recherche</span>
              <input type="search" placeholder="Rechercher un trousseau" />
            </label>

            <label className="field">
              <span>Nombre</span>
              <input type="number" placeholder="20" min="1" />
            </label>

            <label className="field">
              <span>Fichier</span>
              <input type="file" />
            </label>

            <label className="field">
              <span>Sélection</span>
              <select defaultValue="editor">
                <option value="reader">Lecteur</option>
                <option value="editor">Éditeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>

            <label className="field">
              <span>Zone de texte</span>
              <textarea placeholder="Description courte et utile" />
            </label>
          </form>
        </article>
      </section>
    </section>
  )
}
