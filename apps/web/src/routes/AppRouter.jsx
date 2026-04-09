import { useEffect, useState } from 'react'
import { PublicLayout } from '../layouts/PublicLayout.jsx'
import { useAuth } from '../context/authContext.js'
import { LoginPage } from '../pages/auth/LoginPage.jsx'
import { OAuthCallbackPage } from '../pages/auth/OAuthCallbackPage.jsx'
import { RegisterPage } from '../pages/auth/RegisterPage.jsx'
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx'
import { BrandPage } from '../pages/marketing/BrandPage.jsx'
import { LandingPage } from '../pages/marketing/LandingPage.jsx'
import { MessagesPage } from '../pages/messages/MessagesPage.jsx'
import { ItemDetailPage } from '../pages/items/ItemDetailPage.jsx'
import { ItemFormPage } from '../pages/items/ItemFormPage.jsx'
import { ProfilePage } from '../pages/settings/ProfilePage.jsx'
import { VaultCreatePage } from '../pages/vaults/VaultCreatePage.jsx'
import { VaultDetailPage } from '../pages/vaults/VaultDetailPage.jsx'
import { VaultListPage } from '../pages/vaults/VaultListPage.jsx'

const privatePaths = ['/dashboard', '/profil', '/vaults', '/messages']
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

    if (isPrivatePath(path) && !isAuthenticated) {
      navigateToPath('/connexion', setPath)
      return
    }

    if (guestOnlyPaths.has(path) && isAuthenticated) {
      navigateToPath('/dashboard', setPath)
    }
  }, [isAuthenticated, isSessionLoading, path])

  const navigate = (targetPath) => {
    const nextPath = normalizePath(targetPath)

    if (isPrivatePath(nextPath) && !isAuthenticated && !isSessionLoading) {
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
      {renderPage({ path, navigate, isAuthenticated, isSessionLoading })}
    </PublicLayout>
  )
}

function renderPage({ path, navigate, isAuthenticated, isSessionLoading }) {
  const vaultRoute = matchVaultRoute(path)
  const itemRoute = matchItemRoute(path)

  if (vaultRoute !== null) {
    if (isSessionLoading) return <PageStatus message="Restauration de votre session en cours..." />
    if (!isAuthenticated) return <PageStatus message="Redirection vers la connexion..." />

    if (vaultRoute.kind === 'list') return <VaultListPage navigate={navigate} />
    if (vaultRoute.kind === 'create') return <VaultCreatePage navigate={navigate} />
    if (vaultRoute.kind === 'detail') return <VaultDetailPage navigate={navigate} vaultId={vaultRoute.vaultId} />
  }

  if (itemRoute !== null) {
    if (isSessionLoading) return <PageStatus message="Restauration de votre session en cours..." />
    if (!isAuthenticated) return <PageStatus message="Redirection vers la connexion..." />

    if (itemRoute.kind === 'create') return <ItemFormPage itemId={null} navigate={navigate} vaultId={itemRoute.vaultId} />
    if (itemRoute.kind === 'detail') return <ItemDetailPage itemId={itemRoute.itemId} navigate={navigate} vaultId={itemRoute.vaultId} />
    if (itemRoute.kind === 'edit') return <ItemFormPage itemId={itemRoute.itemId} navigate={navigate} vaultId={itemRoute.vaultId} />
  }

  switch (path) {
    case '/brand':
      return <BrandPage />
    case '/connexion':
      return <LoginPage navigate={navigate} />
    case '/dashboard':
      if (isSessionLoading) return <PageStatus message="Restauration de votre session en cours..." />
      if (!isAuthenticated) return <PageStatus message="Redirection vers la connexion..." />
      return <DashboardPage navigate={navigate} />
    case '/messages':
      if (isSessionLoading) return <PageStatus message="Restauration de votre session en cours..." />
      if (!isAuthenticated) return <PageStatus message="Redirection vers la connexion..." />
      return <MessagesPage />
    case '/inscription':
      return <RegisterPage navigate={navigate} />
    case '/oauth/callback':
      return <OAuthCallbackPage navigate={navigate} />
    case '/profil':
      if (isSessionLoading) return <PageStatus message="Restauration de votre session en cours..." />
      if (!isAuthenticated) return <PageStatus message="Redirection vers la connexion..." />
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

function matchVaultRoute(path) {
  if (path === '/vaults') return { kind: 'list' }
  if (path === '/vaults/nouveau') return { kind: 'create' }

  const detailMatch = path.match(/^\/vaults\/(\d+)$/)
  if (detailMatch) {
    return { kind: 'detail', vaultId: Number(detailMatch[1]) }
  }

  return null
}

function matchItemRoute(path) {
  const createMatch = path.match(/^\/vaults\/(\d+)\/items\/nouveau$/)
  if (createMatch) return { kind: 'create', vaultId: Number(createMatch[1]) }

  const editMatch = path.match(/^\/vaults\/(\d+)\/items\/(\d+)\/modifier$/)
  if (editMatch) return { kind: 'edit', vaultId: Number(editMatch[1]), itemId: Number(editMatch[2]) }

  const detailMatch = path.match(/^\/vaults\/(\d+)\/items\/(\d+)$/)
  if (detailMatch) return { kind: 'detail', vaultId: Number(detailMatch[1]), itemId: Number(detailMatch[2]) }

  return null
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

function isPrivatePath(path) {
  return privatePaths.some((privatePath) => path === privatePath || path.startsWith(`${privatePath}/`))
}
