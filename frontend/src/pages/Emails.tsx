import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'
import SendEmailModal from '../components/SendEmailModal'
import Toast from '../components/Toast'

interface Email {
  id: string
  to_address: string
  subject: string
  status: string
  attempt_count: number
  created_at: string
}

const statusColors: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function Emails() {
  const navigate = useNavigate()
  const { currentProject, smtpConnected } = useProject()
  const [emails, setEmails] = useState<Email[]>([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (currentProject) loadEmails()
  }, [currentProject])

  const loadEmails = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/emails/logs/${currentProject.id}`)
      setEmails(res.data)
    } catch (err) {
      console.error('failed to load emails', err)
    }
  }

  const handleSent = () => {
    setShowModal(false)
    setToast('Email queued successfully!')
    loadEmails()
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Create a project first to start sending emails.</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Emails</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Send Email
        </button>
      </div>

      {!smtpConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 flex justify-between items-center">
          <p className="text-sm text-yellow-800">
            No email connected. Emails will be sent from the default address.
          </p>
          <Link to="/connect-email" className="text-yellow-800 text-sm font-medium hover:underline">
            Connect Email
          </Link>
        </div>
      )}

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
          projectId={currentProject.id}
          onClose={() => setShowModal(false)}
          onSent={handleSent}
        />
      )}
    </div>
  )
}
