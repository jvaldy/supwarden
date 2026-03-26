import './App.css'

const checks = [
  { label: 'Frontend', value: 'React + Vite en cours d execution sur le port 5173' },
  { label: 'API', value: 'Conteneur Symfony expose sur le port 8000' },
  { label: 'Base de donnees', value: 'PostgreSQL 16 disponible sur le port 5432' },
  { label: 'Temps reel', value: 'Hub Mercure expose sur le port 3000' },
  { label: 'Administration', value: 'Adminer disponible sur le port 8080' },
]

function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Supwarden</p>
        <h1>La plateforme collaborative de gestion de mots de passe est demarree.</h1>
        <p className="lede">
          Cette page remplace le scaffold Vite par defaut et confirme que l'interface du projet sert bien notre propre application.
        </p>

        <div className="actions">
          <a href="http://localhost:8000/api/health" target="_blank" rel="noreferrer">
            Verifier l etat de l API
          </a>
          <a href="http://localhost:8080" target="_blank" rel="noreferrer">
            Ouvrir l interface de base de donnees
          </a>
        </div>
      </section>

      <section className="status-grid" aria-label="etat de la plateforme">
        {checks.map((item) => (
          <article className="status-card" key={item.label}>
            <h2>{item.label}</h2>
            <p>{item.value}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
