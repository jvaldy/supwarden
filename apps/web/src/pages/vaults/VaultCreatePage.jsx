import { useState } from 'react'
import { useAuth } from '../../context/authContext.js'
import { createVault } from '../../services/api/vaultApi.js'

export function VaultCreatePage({ navigate }) {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Crée un trousseau personnel puis redirige vers sa fiche détail.
  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const responseData = await createVault(token, { name, description })
      setSuccessMessage('Le trousseau a bien été créé.')
      navigate(`/vaults/${responseData.vault.id}`)
    } catch (error) {
      setErrorMessage(error.responseData?.message ?? 'Impossible de créer le trousseau.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-shell vault-form-shell">
      <article className="auth-card vault-card">
        <p className="eyebrow">Nouveau trousseau</p>
        <h1 className="dashboard-title vault-title">Créez un trousseau</h1>
        <p className="lede">Donnez un nom clair à votre trousseau et ajoutez une description utile pour le retrouver facilement.</p>

        <form className="auth-form vault-form" onSubmit={handleSubmit}>
          <label className="field vault-form-wide">
            <span>Nom du trousseau</span>
            <input onChange={(event) => setName(event.target.value)} type="text" value={name} />
          </label>

          <label className="field vault-form-wide">
            <span>Description du trousseau</span>
            <textarea
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Décrivez brièvement l'usage de ce trousseau"
              rows="4"
              value={description}
            />
          </label>

          {successMessage ? <p className="field-feedback field-feedback-success vault-form-wide">{successMessage}</p> : null}
          {errorMessage ? <p className="field-feedback field-feedback-error vault-form-wide">{errorMessage}</p> : null}

          <button className="button-link button-link-primary auth-submit vault-form-wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Création en cours...' : 'Créer le trousseau'}
          </button>

          <button className="button-link button-link-secondary vault-form-wide" onClick={() => navigate('/vaults')} type="button">
            Voir les trousseaux
          </button>
        </form>
      </article>
    </section>
  )
}
