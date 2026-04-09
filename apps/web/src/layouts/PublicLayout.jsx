import { useEffect, useRef, useState } from 'react'
import { NavLink } from '../components/ui/NavLink.jsx'
import { useAuth } from '../context/authContext.js'
import { useMessageNotifications } from '../hooks/useMessageNotifications.js'

export function PublicLayout({ children, navigate, path }) {
  const { isAuthenticated, logout, token } = useAuth()
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const { privateUnreadCount, vaultUnreadCount } = useMessageNotifications(token, {
    enabled: isAuthenticated,
    refreshIntervalMs: 3000,
  })

  useEffect(() => {
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

  function navigateAndClose(targetPath) {
    setIsAccountMenuOpen(false)
    navigate(targetPath)
  }

  async function handleLogout() {
    await logout()
    setIsAccountMenuOpen(false)
    navigate('/')
  }

  const isVaultArea = path === '/vaults' || path.startsWith('/vaults/')

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
          <NavLink className={path === '/dashboard' ? 'nav-link active' : 'nav-link'} onNavigate={navigateAndClose} to="/dashboard">
            Tableau de bord
          </NavLink>

          {isAuthenticated ? (
            <NavLink className={isVaultArea ? 'nav-link active' : 'nav-link'} onNavigate={navigateAndClose} to="/vaults">
              <span>Trousseaux</span>
              {vaultUnreadCount > 0 ? (
                <span className="nav-notification-badge" title="Nouveaux messages de trousseaux">
                  <MessageIcon />
                  <span>{vaultUnreadCount > 99 ? '99+' : vaultUnreadCount}</span>
                </span>
              ) : null}
            </NavLink>
          ) : null}

          {isAuthenticated ? (
            <NavLink className={path === '/messages' ? 'nav-link active' : 'nav-link'} onNavigate={navigateAndClose} to="/messages">
              <span>Messages</span>
              {privateUnreadCount > 0 ? (
                <span className="nav-notification-badge" title="Nouveaux messages privés">
                  <MessageIcon />
                  <span>{privateUnreadCount > 99 ? '99+' : privateUnreadCount}</span>
                </span>
              ) : null}
            </NavLink>
          ) : null}

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
                  v
                </span>
              </button>

              {isAccountMenuOpen ? (
                <div className="account-dropdown" role="menu">
                  <button className="account-dropdown-link" onClick={() => navigateAndClose('/profil')} role="menuitem" type="button">
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

      <div className="app-content">{children}</div>

      <footer className="site-footer">
        <p className="footer-copy">© 2026 Supwarden</p>
        <NavLink className="footer-link" onNavigate={navigateAndClose} to="/brand">
          Charte graphique
        </NavLink>
      </footer>
    </main>
  )
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8A1.5 1.5 0 0 1 19 17.5H8l-4.5 3V8A1.5 1.5 0 0 1 5 6.5Z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  )
}
