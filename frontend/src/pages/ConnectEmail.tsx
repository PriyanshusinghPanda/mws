import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'
import Toast from '../components/Toast'

interface SmtpStatus {
  id: string
  email: string
  smtp_host: string
  smtp_port: number
  is_verified: boolean
}

export default function ConnectEmail() {
  const { currentProject, checkSmtp } = useProject()
  const [smtp, setSmtp] = useState<SmtpStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState(587)

  useEffect(() => {
    if (currentProject) loadSmtpStatus()
  }, [currentProject])

  const loadSmtpStatus = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/smtp/${currentProject.id}`)
      setSmtp(res.data)
    } catch {
      setSmtp(null)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject) return
    setLoading(true)
    setError('')

    try {
      await api.post('/api/smtp/connect', {
        project_id: currentProject.id,
        email,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        username: email,
        password,
        use_tls: true,
      })
      setToast('Email connected successfully! Test email sent.')
      setPassword('')
      loadSmtpStatus()
      checkSmtp()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!currentProject) return
    try {
      await api.delete(`/api/smtp/${currentProject.id}`)
      setSmtp(null)
      setToast('Email disconnected')
      checkSmtp()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect')
    }
  }

  if (!currentProject) {
    return <p className="text-gray-500">Create a project first.</p>
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold mb-6">Connect Email</h1>

      {smtp && smtp.is_verified ? (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg">
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
            Works with any SMTP provider (Zoho, Outlook, custom domain, etc).
          </p>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

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
              {loading ? 'Verifying...' : 'Connect & Verify'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
