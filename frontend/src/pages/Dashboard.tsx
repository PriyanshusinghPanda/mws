import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'
import Toast from '../components/Toast'

interface ApiKeyData {
  id: string
  permissions: string[]
  is_active: boolean
  created_at: string
}

export default function Dashboard() {
  const { projects, currentProject, loadProjects, smtpConnected } = useProject()
  const [newName, setNewName] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (currentProject) loadApiKeys()
  }, [currentProject])

  const loadApiKeys = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/projects/${currentProject.id}/keys`)
      setApiKeys(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await api.post('/api/projects', { name: newName })
      setNewName('')
      setToast('Project created')
      loadProjects()
    } catch (err) {
      console.error(err)
    }
  }

  const generateApiKey = async () => {
    if (!currentProject) return
    try {
      const res = await api.post(`/api/projects/${currentProject.id}/keys`, {
        permissions: ['email:send', 'email:read', 'jobs:create', 'jobs:read'],
      })
      setNewKey(res.data.raw_key)
      loadApiKeys()
    } catch (err) {
      console.error(err)
    }
  }

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setToast('API key copied!')
    }
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* quick status */}
      {currentProject && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Project</p>
            <p className="font-semibold">{currentProject.name}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{smtpConnected ? 'Connected' : 'Not connected'}</p>
            {!smtpConnected && (
              <Link to="/connect-email" className="text-blue-600 text-xs hover:underline">Setup</Link>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">API Keys</p>
            <p className="font-semibold">{apiKeys.length}</p>
          </div>
        </div>
      )}

      {/* create project */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Create Project</h2>
        <form onSubmit={createProject} className="flex gap-3">
          <input
            type="text"
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Create
          </button>
        </form>
      </div>

      {/* api keys */}
      {currentProject && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">API Keys</h2>
            <button
              onClick={generateApiKey}
              className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900"
            >
              Generate Key
            </button>
          </div>

          {newKey && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <p className="text-xs text-green-700 mb-1">Copy this key now. It won't be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-green-100 px-2 py-1 rounded flex-1 break-all">{newKey}</code>
                <button onClick={copyKey} className="text-green-700 text-sm font-medium hover:underline">Copy</button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <p className="text-gray-400 text-sm">No API keys yet. Generate one to use the API.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <code className="text-xs text-gray-500">{k.id.slice(0, 8)}...</code>
                    <span className="ml-2 text-xs text-gray-400">
                      {k.permissions.join(', ')}
                    </span>
                  </div>
                  <span className={`text-xs ${k.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {k.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* quick links */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Quick Links</h2>
        <div className="flex gap-4">
          <Link to="/emails" className="text-blue-600 text-sm hover:underline">Send Emails</Link>
          <Link to="/templates" className="text-blue-600 text-sm hover:underline">Manage Templates</Link>
          <Link to="/connect-email" className="text-blue-600 text-sm hover:underline">Connect Email</Link>
        </div>
      </div>
    </div>
  )
}
