import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'

interface EmailData {
  id: string
  to_address: string
  subject: string
  status: string
  attempt_count: number
  error_message: string | null
  sent_at: string | null
  created_at: string
}

const statusColors: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function EmailDetail() {
  const { emailId } = useParams()
  const [email, setEmail] = useState<EmailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEmail()
    // poll every 3 seconds to see status updates
    const interval = setInterval(loadEmail, 3000)
    return () => clearInterval(interval)
  }, [emailId])

  const loadEmail = async () => {
    try {
      const res = await api.get(`/api/emails/${emailId}`)
      setEmail(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading...</p>
  if (!email) return <p className="text-red-500">Email not found</p>

  return (
    <div>
      <Link to="/emails" className="text-blue-600 text-sm hover:underline mb-4 inline-block">
        &larr; Back to emails
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{email.subject}</h1>
          <span className={`px-3 py-1 rounded text-sm font-medium ${statusColors[email.status] || 'bg-gray-100'}`}>
            {email.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">To</p>
            <p className="font-medium">{email.to_address}</p>
          </div>
          <div>
            <p className="text-gray-500">Attempts</p>
            <p className="font-medium">{email.attempt_count} / 3</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium">{new Date(email.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Sent at</p>
            <p className="font-medium">
              {email.sent_at ? new Date(email.sent_at).toLocaleString() : '—'}
            </p>
          </div>
        </div>

        {email.error_message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <p className="font-medium mb-1">Error</p>
            <p>{email.error_message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
