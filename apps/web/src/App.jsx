import './App.css'

const colorGroups = [
  {
    title: 'Couleurs principales',
    items: [
      { name: 'Ink 950', value: '#08111D', role: 'Fond principal' },
      { name: 'Ink 900', value: '#0F1D2D', role: 'Profondeur' },
      { name: 'Ink 800', value: '#13263A', role: 'Sections et degrades' },
      { name: 'Cyan 500', value: '#5FA8D3', role: 'Halo et signature' },
      { name: 'Cyan 400', value: '#8FD3FF', role: 'Accent principal' },
      { name: 'Cyan 300', value: '#ADD8FF', role: 'Bordures et details' },
    ],
  },
  {
    title: 'Etats fonctionnels',
    items: [
      { name: 'Success', value: '#7EE0B5', role: 'Validation et securite' },
      { name: 'Warning', value: '#FFD27A', role: 'Alerte moderee' },
      { name: 'Danger', value: '#FF8F9F', role: 'Erreur et action critique' },
    ],
  },
]

const principles = [
  'Securite visible sans lourdeur graphique',
  'Interfaces sobres, lisibles et respirantes',
  'Accent cyan reserve aux points importants',
]

const buttonExamples = [
  { label: 'Action principale', className: 'button button-primary' },
  { label: 'Action secondaire', className: 'button button-secondary' },
  { label: 'Action critique', className: 'button button-danger' },
]

const statusCards = [
  { label: 'Frontend', value: 'React + Vite structure la surface produit.' },
  { label: 'API', value: 'Symfony porte les flux metier et les endpoints.' },
  { label: 'Collaboration', value: 'Le ton visuel reste net, calme et fiable.' },
  { label: 'Accessibilite', value: 'Contrastes forts et hierarchie lisible.' },
]

const tableRows = [
  { pattern: 'Bouton principal', usage: 'Actions prioritaires', example: 'Creer un trousseau' },
  { pattern: 'Badge statut', usage: 'Etat systeme ou item', example: 'Sain, en attente, critique' },
  { pattern: 'Carte vitree', usage: 'Blocs de synthese', example: 'Resume de trousseau' },
]

function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Supwarden brand system</p>
          <h1>Charte graphique complete, prete a servir de base produit.</h1>
          <p className="lede">
            Cette planche rassemble la palette, la typographie, les composants, les etats et le ton visuel de Supwarden pour guider toutes les futures interfaces.
          </p>
        </div>

        <div className="hero-side">
          <p className="panel-label">Principes directeurs</p>
          <ul className="principles-list">
            {principles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="showcase-grid" aria-label="elements de la charte">
        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Palette</p>
            <h2>Couleurs de reference</h2>
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
            <h2>Hierarchie editoriale</h2>
          </div>

          <div className="type-specimen">
            <p className="type-overline">Sora pour les titres</p>
            <p className="type-display">Proteger les acces sans alourdir l experience.</p>
            <p className="type-body-large">
              Inter structure la lecture courante avec une presence nette et contemporaine.
            </p>
            <p className="type-body">
              La voix visuelle doit rester claire, confiante et fonctionnelle. Le texte ne crie jamais, il guide.
            </p>
            <code>JetBrains Mono pour les donnees techniques</code>
          </div>
        </article>

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Actions</p>
            <h2>Boutons et badges</h2>
          </div>

          <div className="button-stack">
            {buttonExamples.map((item) => (
              <button key={item.label} className={item.className} type="button">
                {item.label}
              </button>
            ))}
          </div>

          <div className="badge-row">
            <span className="badge badge-info">Partage securise</span>
            <span className="badge badge-success">Systeme sain</span>
            <span className="badge badge-warning">Verification requise</span>
            <span className="badge badge-danger">Acces revoke</span>
          </div>
        </article>

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Formulaires</p>
            <h2>Champ, aide et feedback</h2>
          </div>

          <form className="form-demo">
            <label className="field">
              <span>Nom du trousseau</span>
              <input defaultValue="Equipe securite" type="text" />
            </label>

            <label className="field">
              <span>Role d acces</span>
              <select defaultValue="admin">
                <option value="reader">Lecteur</option>
                <option value="editor">Editeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>

            <p className="field-help">Utiliser un libelle simple, direct et oriente usage.</p>
            <p className="field-feedback field-feedback-success">Configuration validee pour le partage d equipe.</p>
          </form>
        </article>

        <article className="showcase-card showcase-card-wide">
          <div className="section-heading">
            <p className="panel-label">Composants</p>
            <h2>Cartes, tableaux et tonalite produit</h2>
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
                  <th>Usage</th>
                  <th>Exemple</th>
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

        <article className="showcase-card">
          <div className="section-heading">
            <p className="panel-label">Dos and donts</p>
            <h2>Regles d usage</h2>
          </div>

          <div className="guideline-list">
            <div className="guideline good">
              <strong>A faire</strong>
              <p>Prioriser les contrastes, limiter les accents et garder des interfaces ouvertes.</p>
            </div>
            <div className="guideline bad">
              <strong>A eviter</strong>
              <p>Empiler trop de couleurs, de bordures ou d effets brillants sur une meme vue.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
