import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    // Journalise côté navigateur pour faciliter le diagnostic en production.
    console.error('Erreur non gérée dans l’interface', error)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="auth-shell">
          <article className="auth-card">
            <p className="eyebrow">Incident interface</p>
            <h1 className="dashboard-title">Une erreur inattendue est survenue.</h1>
            <p className="lede">Rechargez la page pour reprendre votre parcours.</p>
            <button className="button-link button-link-primary" onClick={this.handleReload} type="button">
              Recharger la page
            </button>
          </article>
        </section>
      )
    }

    return this.props.children
  }
}


