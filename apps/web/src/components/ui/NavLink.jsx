// Remplace la navigation native par la navigation interne du routeur maison.
export function NavLink({ children, className, onNavigate, to }) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(to)
      }}
    >
      {children}
    </a>
  )
}
