import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/emails': 'Emails',
  '/templates': 'Templates',
  '/connect-email': 'Connect Email',
  '/jobs': 'Jobs',
  '/settings': 'Settings',
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { projects, currentProject, setCurrentProject } = useProject()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // figure out page title from path
  const title = pageTitles[location.pathname] || 'Mini AWS'

  return (
    <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      <div className="flex items-center gap-4">
        {projects.length > 0 && (
          <select
            value={currentProject?.id || ''}
            onChange={(e) => {
              const p = projects.find(p => p.id === e.target.value)
              if (p) setCurrentProject(p)
            }}
            className="border rounded px-2 py-1 text-sm text-gray-600"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
