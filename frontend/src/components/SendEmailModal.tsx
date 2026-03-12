import { useState } from 'react'
import api from '../lib/api'

interface Props {
  projectId: string
  onClose: () => void
  onSent: () => void
}

export default function SendEmailModal({ projectId, onClose, onSent }: Props) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')

    try {
      await api.post('/api/emails/send', {
        project_id: projectId,
        to_address: to,
        subject,
        body_html: body,
      })
      onSent()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">Send Email</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="To address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            required
          />
          <textarea
            placeholder="Email body (HTML)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="border rounded px-3 py-2 text-sm h-32"
            required
          />
          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
