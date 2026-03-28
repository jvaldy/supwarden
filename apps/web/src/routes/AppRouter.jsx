import { useEffect, useState } from 'react'
import { PublicLayout } from '../layouts/PublicLayout.jsx'
import { useAuth } from '../context/authContext.js'
import { LoginPage } from '../pages/auth/LoginPage.jsx'
import { RegisterPage } from '../pages/auth/RegisterPage.jsx'
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx'
import { BrandPage } from '../pages/marketing/BrandPage.jsx'
import { LandingPage } from '../pages/marketing/LandingPage.jsx'
import { ProfilePage } from '../pages/settings/ProfilePage.jsx'

const privatePaths = new Set(['/dashboard', '/profil'])
const guestOnlyPaths = new Set(['/connexion', '/inscription'])

export function AppRouter() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))
  const { isAuthenticated, isSessionLoading } = useAuth()

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname))
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (isSessionLoading) {
      return
    }

    // Bloque l'accès direct aux pages privées sans session valide.
    if (privatePaths.has(path) && !isAuthenticated) {
      navigateToPath('/connexion', setPath)
      return
    }

    // Évite de laisser un utilisateur connecté sur les pages d'entrée.
    if (guestOnlyPaths.has(path) && isAuthenticated) {
      navigateToPath('/dashboard', setPath)
    }
  }, [isAuthenticated, isSessionLoading, path])

  const navigate = (targetPath) => {
    const nextPath = normalizePath(targetPath)

    // Garde les mêmes règles d'accès sur navigation interne et URL saisie à la main.
    if (privatePaths.has(nextPath) && !isAuthenticated && !isSessionLoading) {
      navigateToPath('/connexion', setPath)
      return
    }

    if (guestOnlyPaths.has(nextPath) && isAuthenticated && !isSessionLoading) {
      navigateToPath('/dashboard', setPath)
      return
    }

    navigateToPath(nextPath, setPath)
  }

  return (
    <PublicLayout navigate={navigate} path={path}>
      {renderPage({
        path,
        navigate,
        isAuthenticated,
        isSessionLoading,
      })}
    </PublicLayout>
  )
}

function renderPage({ path, navigate, isAuthenticated, isSessionLoading }) {
  switch (path) {
    case '/brand':
      return <BrandPage />
    case '/connexion':
      return <LoginPage navigate={navigate} />
    case '/dashboard':
      if (isSessionLoading) {
        return <PageStatus message="Restauration de votre session en cours..." />
      }

      if (!isAuthenticated) {
        return <PageStatus message="Redirection vers la connexion..." />
      }

      return <DashboardPage />
    case '/inscription':
      return <RegisterPage navigate={navigate} />
    case '/profil':
      if (isSessionLoading) {
        return <PageStatus message="Restauration de votre session en cours..." />
      }

      if (!isAuthenticated) {
        return <PageStatus message="Redirection vers la connexion..." />
      }

      return <ProfilePage navigate={navigate} />
    default:
      return <LandingPage navigate={navigate} />
  }
}

function PageStatus({ message }) {
  return (
    <section className="auth-shell">
      <article className="auth-card">
        <p className="lede">{message}</p>
      </article>
    </section>
  )
}

function navigateToPath(path, setPath) {
  if (path !== window.location.pathname) {
    window.history.pushState({}, '', path)
  }

  setPath(path)
}

function normalizePath(value) {
  const trimmed = value.replace(/\/+$/, '')
  return trimmed || '/'
}
