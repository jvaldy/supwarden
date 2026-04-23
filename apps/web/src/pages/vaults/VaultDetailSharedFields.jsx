import { FieldIcon } from './VaultDetailSharedIcons.jsx'

export function CopyField({ label, value, fieldKey, copiedFieldKey, onCopy, icon, compact = false, fieldClass = '' }) {
  return (
    <div className={`vault-item-copy-field${compact ? ' vault-item-copy-field-compact' : ''}${fieldClass ? ` ${fieldClass}` : ''}`}>
      <div className="vault-item-copy-field-head">
        <FieldIcon name={icon} />
        {compact ? null : <span>{label}</span>}
      </div>
      <div className="vault-item-copy-field-body">
        <p>{value}</p>
      </div>
      <button className="button-link button-link-tertiary item-copy-button" type="button" onClick={onCopy} title="Copier">
        <FieldIcon name={copiedFieldKey === fieldKey ? 'check' : 'copy'} />
      </button>
    </div>
  )
}

export function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8A1.5 1.5 0 0 1 19 17.5H8l-4.5 3V8A1.5 1.5 0 0 1 5 6.5Z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  )
}

