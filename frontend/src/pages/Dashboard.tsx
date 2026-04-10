import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'
import Toast from '../components/Toast'

interface ApiKeyData {
  id: string
  permissions: string[]
  is_active: boolean
  created_at: string
}

interface Analytics {
  emails: { total: number; sent: number; failed: number }
  jobs: { total: number; active: number }
  runs_last_7d: { success: number; failed: number }
  emails_per_day: { date: string; count: number }[]
}

export default function Dashboard() {
  const { projects, currentProject, loadProjects, smtpConnected } = useProject()
  const [newName, setNewName] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    if (currentProject) {
      loadApiKeys()
      loadAnalytics()
    }
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

  const loadAnalytics = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/analytics/${currentProject.id}`)
      setAnalytics(res.data)
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

      {/* stats cards */}
      {currentProject && analytics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Emails Sent</p>
            <p className="text-2xl font-bold text-green-600">{analytics.emails.sent}</p>
            <p className="text-xs text-gray-400">{analytics.emails.failed} failed</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Emails</p>
            <p className="text-2xl font-bold">{analytics.emails.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Jobs</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.jobs.active}</p>
            <p className="text-xs text-gray-400">{analytics.jobs.total} total</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Job Runs (7d)</p>
            <p className="text-2xl font-bold text-green-600">{analytics.runs_last_7d.success}</p>
            <p className="text-xs text-gray-400">{analytics.runs_last_7d.failed} failed</p>
          </div>
        </div>
      )}

      {/* emails chart */}
      {analytics && analytics.emails_per_day.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-3">Emails — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.emails_per_day}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* smtp status */}
      {currentProject && (
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email Connection</p>
            <p className="text-xs text-gray-500">
              {smtpConnected ? 'Your email is connected and ready to send.' : 'Connect your email to send from your own address.'}
            </p>
          </div>
          {smtpConnected ? (
            <span className="text-green-600 text-sm font-medium">Connected</span>
          ) : (
            <Link to="/connect-email" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Connect</Link>
          )}
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
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
            Create
          </button>
        </form>
      </div>

      {/* api keys */}
      {currentProject && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">API Keys</h2>
            <button onClick={generateApiKey}
              className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900">
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
            <p className="text-gray-400 text-sm">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <code className="text-xs text-gray-500">{k.id.slice(0, 8)}...</code>
                    <span className="ml-2 text-xs text-gray-400">{k.permissions.join(', ')}</span>
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
    </div>
  )
}
