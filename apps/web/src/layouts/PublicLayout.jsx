import { NavLink } from '../components/ui/NavLink.jsx'

export function PublicLayout({ children, navigate, path }) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <NavLink className="brandmark" onNavigate={navigate} to="/">
          Supwarden
        </NavLink>

        <nav className="topnav" aria-label="navigation principale">
          <NavLink className={path === '/' ? 'nav-link active' : 'nav-link'} onNavigate={navigate} to="/">
            Accueil
          </NavLink>
          <NavLink
            className={path === '/dashboard' ? 'nav-link active' : 'nav-link'}
            onNavigate={navigate}
            to="/dashboard"
          >
            Tableau de bord
          </NavLink>
        </nav>
      </header>

      {children}

      <footer className="site-footer">
        <p className="footer-copy">© 2026 Supwarden</p>
        <NavLink className="footer-link" onNavigate={navigate} to="/brand">
          Charte graphique
        </NavLink>
      </footer>
    </main>
  )
}
