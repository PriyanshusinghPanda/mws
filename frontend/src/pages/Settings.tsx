import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'
import Toast from '../components/Toast'

interface ApiKeyData {
  id: string
  permissions: string[]
  is_active: boolean
  created_at: string
}

export default function Settings() {
  const { currentProject, projects, loadProjects } = useProject()
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

  const generateKey = async () => {
    if (!currentProject) return
    try {
      const res = await api.post(`/api/projects/${currentProject.id}/keys`, {
        permissions: ['email:send', 'email:read', 'jobs:create', 'jobs:read'],
      })
      setNewKey(res.data.raw_key)
      setToast('API key generated')
      loadApiKeys()
    } catch (err) {
      console.error(err)
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setToast('Copied!')
  }

  if (!currentProject) {
    return <p className="text-gray-500">Create a project first.</p>
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* project info */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Project</h2>
        <div className="text-sm">
          <p><span className="text-gray-500">Name:</span> {currentProject.name}</p>
          <p><span className="text-gray-500">ID:</span> <code className="text-xs bg-gray-100 px-1 rounded">{currentProject.id}</code></p>
        </div>
      </div>

      {/* api keys */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">API Keys</h2>
          <button onClick={generateKey}
            className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900">
            Generate New Key
          </button>
        </div>

        {newKey && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <p className="text-xs text-green-700 mb-1">Save this key — you won't see it again.</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-green-100 px-2 py-1 rounded flex-1 break-all">{newKey}</code>
              <button onClick={() => copyKey(newKey)} className="text-green-700 text-sm font-medium hover:underline">Copy</button>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <p className="text-gray-400 text-sm">No API keys yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-500 font-medium">Key ID</th>
                <th className="text-left py-2 text-gray-500 font-medium">Permissions</th>
                <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                <th className="text-left py-2 text-gray-500 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{k.id.slice(0, 12)}...</td>
                  <td className="py-2 text-xs text-gray-500">{k.permissions.join(', ')}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {k.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-400">{new Date(k.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* quick start */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Quick Start</h2>
        <p className="text-sm text-gray-500 mb-3">Use your API key to send emails programmatically:</p>
        <pre className="bg-gray-900 text-green-400 rounded p-4 text-xs overflow-x-auto">
{`curl -X POST http://localhost:8000/api/emails/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${currentProject.id}",
    "to_address": "user@example.com",
    "subject": "Hello!",
    "body_html": "<h1>Hello from Mini AWS</h1>"
  }'`}
        </pre>
      </div>
    </div>
  )
}
