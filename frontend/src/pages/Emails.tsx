import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import SendEmailModal from '../components/SendEmailModal'

interface Email {
  id: string
  to_address: string
  subject: string
  status: string
  attempt_count: number
  created_at: string
}

// colors for different statuses
const statusColors: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function Emails() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [showModal, setShowModal] = useState(false)
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId) loadEmails()
  }, [projectId])

  const loadProjects = async () => {
    try {
      const res = await api.get('/api/projects')
      setProjects(res.data)
      if (res.data.length > 0) setProjectId(res.data[0].id)
    } catch (err) {
      console.error('failed to load projects', err)
    }
  }

  const loadEmails = async () => {
    try {
      const res = await api.get(`/api/emails/logs/${projectId}`)
      setEmails(res.data)
    } catch (err) {
      console.error('failed to load emails', err)
    }
  }

  const handleSent = () => {
    setShowModal(false)
    loadEmails()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Emails</h1>
        <div className="flex gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Send Email
          </button>
        </div>
      </div>

      {/* email logs table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">To</th>
              <th className="px-4 py-3 font-medium text-gray-600">Subject</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Attempts</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No emails sent yet
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <tr key={email.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/emails/${email.id}`)}>
                  <td className="px-4 py-3">{email.to_address}</td>
                  <td className="px-4 py-3">{email.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[email.status] || 'bg-gray-100'}`}>
                      {email.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{email.attempt_count}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(email.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <SendEmailModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSent={handleSent}
        />
      )}
    </div>
  )
}
