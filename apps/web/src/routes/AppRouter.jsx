import { useEffect, useState } from 'react'
import { PublicLayout } from '../layouts/PublicLayout.jsx'
import { LoginPage } from '../pages/auth/LoginPage.jsx'
import { RegisterPage } from '../pages/auth/RegisterPage.jsx'
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx'
import { BrandPage } from '../pages/marketing/BrandPage.jsx'
import { LandingPage } from '../pages/marketing/LandingPage.jsx'

export function AppRouter() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname))
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (targetPath) => {
    const nextPath = normalizePath(targetPath)

    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', nextPath)
    }

    setPath(nextPath)
  }

  return (
    <PublicLayout navigate={navigate} path={path}>
      {renderPage(path, navigate)}
    </PublicLayout>
  )
}

function renderPage(path, navigate) {
  switch (path) {
    case '/brand':
      return <BrandPage />
    case '/connexion':
      return <LoginPage navigate={navigate} />
    case '/dashboard':
      return <DashboardPage />
    case '/inscription':
      return <RegisterPage navigate={navigate} />
    default:
      return <LandingPage navigate={navigate} />
  }
}

function normalizePath(value) {
  const trimmed = value.replace(/\/+$/, '')
  return trimmed || '/'
}
