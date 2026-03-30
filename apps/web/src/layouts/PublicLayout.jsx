import { useEffect, useRef, useState } from 'react'
import { NavLink } from '../components/ui/NavLink.jsx'
import { useAuth } from '../context/authContext.js'

export function PublicLayout({ children, navigate, path }) {
  const { isAuthenticated, logout } = useAuth()
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    // Referme le menu si l'utilisateur clique ailleurs dans la page.
    function handleOutsideClick(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Ferme le menu avant toute navigation déclenchée depuis le header ou le footer.
  function navigateAndClose(targetPath) {
    setIsAccountMenuOpen(false)
    navigate(targetPath)
  }

  // Coupe la session depuis la navigation puis revient sur l'accueil public.
  async function handleLogout() {
    await logout()
    setIsAccountMenuOpen(false)
    navigate('/')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <NavLink className="brandmark" onNavigate={navigateAndClose} to="/">
          Supwarden
        </NavLink>

        <nav className="topnav" aria-label="navigation principale">
          <NavLink className={path === '/' ? 'nav-link active' : 'nav-link'} onNavigate={navigateAndClose} to="/">
            Accueil
          </NavLink>
          <NavLink
            className={path === '/dashboard' ? 'nav-link active' : 'nav-link'}
            onNavigate={navigateAndClose}
            to="/dashboard"
          >
            Tableau de bord
          </NavLink>

          {isAuthenticated ? (
            <div className="account-menu" ref={accountMenuRef}>
              <button
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                className={path === '/profil' ? 'nav-link active account-menu-trigger' : 'nav-link account-menu-trigger'}
                onClick={() => setIsAccountMenuOpen((currentState) => !currentState)}
                type="button"
              >
                Mon compte
                <span className="account-menu-caret" aria-hidden="true">
                  ▾
                </span>
              </button>

              {isAccountMenuOpen ? (
                <div className="account-dropdown" role="menu">
                  <button
                    className="account-dropdown-link"
                    onClick={() => navigateAndClose('/profil')}
                    role="menuitem"
                    type="button"
                  >
                    Profil
                  </button>
                  <button className="account-dropdown-link" onClick={handleLogout} role="menuitem" type="button">
                    Se déconnecter
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
      </header>

      {children}

      <footer className="site-footer">
        <p className="footer-copy">© 2026 Supwarden</p>
        <NavLink className="footer-link" onNavigate={navigateAndClose} to="/brand">
          Charte graphique
        </NavLink>
      </footer>
    </main>
  )
}
