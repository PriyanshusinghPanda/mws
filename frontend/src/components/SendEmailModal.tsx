import { useState, useEffect } from 'react'
import api from '../lib/api'

interface Template {
  id: string
  name: string
  subject: string
}

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

  // template stuff
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [variables, setVariables] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const res = await api.get(`/api/templates/${projectId}`)
      setTemplates(res.data)
    } catch (err) {
      // no templates, thats fine
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')

    try {
      const payload: any = {
        project_id: projectId,
        to_address: to,
      }

      if (useTemplate && selectedTemplate) {
        payload.template_id = selectedTemplate
        // parse variables from simple key=value format
        if (variables.trim()) {
          const vars: Record<string, string> = {}
          variables.split('\n').forEach(line => {
            const [key, ...rest] = line.split('=')
            if (key && rest.length) vars[key.trim()] = rest.join('=').trim()
          })
          payload.variables = vars
        }
      } else {
        payload.subject = subject
        payload.body_html = body
      }

      await api.post('/api/emails/send', payload)
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

        {templates.length > 0 && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUseTemplate(false)}
              className={`px-3 py-1 rounded text-sm ${!useTemplate ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Custom
            </button>
            <button
              type="button"
              onClick={() => setUseTemplate(true)}
              className={`px-3 py-1 rounded text-sm ${useTemplate ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Use Template
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="To address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            required
          />

          {useTemplate ? (
            <>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
                required
              >
                <option value="">Select a template</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <textarea
                placeholder={"Variables (one per line):\nname=John\ncompany=Acme"}
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                className="border rounded px-3 py-2 text-sm h-24 font-mono"
              />
            </>
          ) : (
            <>
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
            </>
          )}

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
