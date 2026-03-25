import { useState, useEffect } from 'react'
import api from '../lib/api'

interface SmtpStatus {
  id: string
  email: string
  smtp_host: string
  smtp_port: number
  is_verified: boolean
}

export default function ConnectEmail() {
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [smtp, setSmtp] = useState<SmtpStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState(587)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId) loadSmtpStatus()
  }, [projectId])

  const loadProjects = async () => {
    const res = await api.get('/api/projects')
    setProjects(res.data)
    if (res.data.length > 0) setProjectId(res.data[0].id)
  }

  const loadSmtpStatus = async () => {
    try {
      const res = await api.get(`/api/smtp/${projectId}`)
      setSmtp(res.data)
    } catch {
      setSmtp(null)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/api/smtp/connect', {
        project_id: projectId,
        email,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        username: email,
        password,
        use_tls: true,
      })
      setSuccess('Email connected! A test email was sent to verify.')
      setPassword('')
      loadSmtpStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await api.delete(`/api/smtp/${projectId}`)
      setSmtp(null)
      setSuccess('Email disconnected')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Connect Email</h1>

      <div className="mb-4">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {smtp && smtp.is_verified ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h2 className="font-semibold text-lg">Connected</h2>
          </div>
          <p className="text-sm text-gray-600 mb-1">Email: <span className="font-medium">{smtp.email}</span></p>
          <p className="text-sm text-gray-600 mb-4">Server: {smtp.smtp_host}:{smtp.smtp_port}</p>
          <p className="text-xs text-gray-400 mb-4">All emails from this project will be sent using this account.</p>
          <button
            onClick={handleDisconnect}
            className="text-red-600 text-sm hover:underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg">
          <h2 className="font-semibold mb-2">Connect your email account</h2>
          <p className="text-sm text-gray-500 mb-4">
            For Gmail: go to Google Account &gt; Security &gt; App Passwords, generate one and paste it below.
          </p>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

          <form onSubmit={handleConnect} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="your.email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              placeholder="App password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="SMTP host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="border rounded px-3 py-2 text-sm flex-1"
              />
              <input
                type="number"
                placeholder="Port"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                className="border rounded px-3 py-2 text-sm w-24"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect & Verify'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
