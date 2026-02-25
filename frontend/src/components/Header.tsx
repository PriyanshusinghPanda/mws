import { useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-700">Dashboard</h2>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Logout
      </button>
    </header>
  )
}
