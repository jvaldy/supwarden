export function NavLink({ children, className, onNavigate, to }) {
  function handleClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    onNavigate(to)
  }

  return (
    <a className={className} href={to} onClick={handleClick}>
      {children}
    </a>
  )
}

