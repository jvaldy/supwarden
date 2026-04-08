import { useCallback, useEffect, useState } from 'react'
import { useSecretMaskTimeoutMs } from './useSecretMaskTimeoutMs.js'

export function useSecretUnlockSession() {
  const [pin, setPin] = useState('')
  const [unlockStartedAt, setUnlockStartedAt] = useState(0)
  const timeoutMs = useSecretMaskTimeoutMs()

  const isUnlocked = pin !== '' && unlockStartedAt > 0

  const clearUnlock = useCallback(() => {
    setPin('')
    setUnlockStartedAt(0)
  }, [])

  const rememberPin = useCallback((nextPin) => {
    if (!nextPin) {
      clearUnlock()
      return ''
    }

    setPin(nextPin)
    setUnlockStartedAt(Date.now())
    return nextPin
  }, [clearUnlock])

  const requestPin = useCallback(async (promptMessage, options = {}) => {
    const forcePrompt = options?.forcePrompt === true
    // Évite de redemander le PIN tant que la session de déverrouillage est encore valide.
    if (!forcePrompt && pin !== '' && unlockStartedAt > 0 && unlockStartedAt + timeoutMs > Date.now()) {
      setUnlockStartedAt(Date.now())
      return pin
    }

    const enteredPin = await promptForMaskedPin(promptMessage)

    if (enteredPin === null) {
      return null
    }

    return rememberPin(enteredPin)
  }, [pin, rememberPin, timeoutMs, unlockStartedAt])

  useEffect(() => {
    if (!isUnlocked) {
      return undefined
    }

    const remainingMs = Math.max(0, unlockStartedAt + timeoutMs - Date.now())
    const timeoutId = window.setTimeout(() => {
      clearUnlock()
    }, remainingMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [clearUnlock, isUnlocked, timeoutMs, unlockStartedAt])

  useEffect(() => {
    function handleVisibilityChange() {
      // Reverrouille dès que l’onglet passe en arrière-plan.
      if (document.hidden) {
        clearUnlock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearUnlock])

  return {
    clearUnlock,
    isUnlocked,
    rememberPin,
    requestPin,
  }
}

function promptForMaskedPin(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.zIndex = '9999'
    overlay.style.display = 'grid'
    overlay.style.placeItems = 'center'
    overlay.style.padding = '1rem'
    overlay.style.background = 'rgba(3, 8, 15, 0.68)'

    const panel = document.createElement('div')
    panel.style.width = 'min(100%, 26rem)'
    panel.style.display = 'grid'
    panel.style.gap = '0.85rem'
    panel.style.padding = '1rem'
    panel.style.borderRadius = '1rem'
    panel.style.border = '1px solid rgba(173, 216, 255, 0.2)'
    panel.style.background = 'rgba(8, 17, 29, 0.98)'

    const title = document.createElement('strong')
    title.textContent = 'Code PIN requis'
    title.style.color = '#eef6ff'

    const text = document.createElement('p')
    text.textContent = message || 'Saisissez votre code PIN.'
    text.style.margin = '0'
    text.style.color = '#c7dcef'
    text.style.fontSize = '0.95rem'

    const autofillTrapUser = document.createElement('input')
    autofillTrapUser.type = 'text'
    autofillTrapUser.autocomplete = 'username'
    autofillTrapUser.tabIndex = -1
    autofillTrapUser.setAttribute('aria-hidden', 'true')
    autofillTrapUser.style.position = 'absolute'
    autofillTrapUser.style.opacity = '0'
    autofillTrapUser.style.pointerEvents = 'none'
    autofillTrapUser.style.height = '0'

    const autofillTrapPassword = document.createElement('input')
    autofillTrapPassword.type = 'password'
    autofillTrapPassword.autocomplete = 'current-password'
    autofillTrapPassword.tabIndex = -1
    autofillTrapPassword.setAttribute('aria-hidden', 'true')
    autofillTrapPassword.style.position = 'absolute'
    autofillTrapPassword.style.opacity = '0'
    autofillTrapPassword.style.pointerEvents = 'none'
    autofillTrapPassword.style.height = '0'

    const input = document.createElement('input')
    input.type = 'password'
    input.autocomplete = 'new-password'
    input.name = 'vault_secret_pin'
    input.id = 'vault-secret-pin'
    input.inputMode = 'numeric'
    input.spellcheck = false
    input.autocapitalize = 'off'
    input.autocorrect = 'off'
    input.setAttribute('data-lpignore', 'true')
    input.setAttribute('data-1p-ignore', 'true')
    input.setAttribute('data-form-type', 'other')
    input.placeholder = 'Code PIN'
    input.style.width = '100%'
    input.style.minHeight = '44px'
    input.style.padding = '0.75rem 0.9rem'
    input.style.borderRadius = '0.9rem'
    input.style.border = '1px solid rgba(173, 216, 255, 0.22)'
    input.style.background = 'rgba(8, 17, 29, 0.9)'
    input.style.color = '#eef6ff'

    const actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.justifyContent = 'flex-end'
    actions.style.gap = '0.6rem'

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.textContent = 'Annuler'
    cancelButton.style.minHeight = '40px'
    cancelButton.style.padding = '0.55rem 0.9rem'
    cancelButton.style.borderRadius = '999px'
    cancelButton.style.border = '1px solid rgba(173, 216, 255, 0.28)'
    cancelButton.style.background = 'linear-gradient(180deg, rgba(173, 216, 255, 0.14), rgba(143, 211, 255, 0.1))'
    cancelButton.style.color = '#c7dcef'
    cancelButton.style.cursor = 'pointer'

    const submitButton = document.createElement('button')
    submitButton.type = 'button'
    submitButton.textContent = 'Valider'
    submitButton.style.minHeight = '40px'
    submitButton.style.padding = '0.55rem 0.9rem'
    submitButton.style.borderRadius = '999px'
    submitButton.style.border = '1px solid transparent'
    submitButton.style.background = 'linear-gradient(180deg, rgba(173, 216, 255, 0.98), rgba(143, 211, 255, 0.92))'
    submitButton.style.color = '#08111d'
    submitButton.style.cursor = 'pointer'

    const cleanup = (value) => {
      overlay.remove()
      resolve(value)
    }

    cancelButton.addEventListener('click', () => cleanup(null))
    submitButton.addEventListener('click', () => cleanup(input.value))

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        cleanup(input.value)
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(null)
      }
    })

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup(null)
      }
    })

    actions.append(cancelButton, submitButton)
    panel.append(title, text, autofillTrapUser, autofillTrapPassword, input, actions)
    overlay.append(panel)
    document.body.append(overlay)
    input.value = ''
    window.setTimeout(() => {
      input.value = ''
      input.focus()
    }, 0)
  })
}
