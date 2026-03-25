import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/emails', label: 'Emails' },
  { to: '/templates', label: 'Templates' },
  { to: '/connect-email', label: 'Connect Email' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-xl font-bold mb-8">Mini AWS</h1>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700' : 'hover:bg-gray-800'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
