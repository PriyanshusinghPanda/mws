import { useState, useEffect } from 'react'
import api from '../lib/api'

interface Template {
  id: string
  name: string
  subject: string
  body_html: string
  created_at: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId) loadTemplates()
  }, [projectId])

  const loadProjects = async () => {
    const res = await api.get('/api/projects')
    setProjects(res.data)
    if (res.data.length > 0) setProjectId(res.data[0].id)
  }

  const loadTemplates = async () => {
    try {
      const res = await api.get(`/api/templates/${projectId}`)
      setTemplates(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const resetForm = () => {
    setName('')
    setSubject('')
    setBodyHtml('')
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.put(`/api/templates/${editingId}`, { name, subject, body_html: bodyHtml })
      } else {
        await api.post('/api/templates', {
          project_id: projectId,
          name,
          subject,
          body_html: bodyHtml,
        })
      }
      resetForm()
      loadTemplates()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save template')
    }
  }

  const handleEdit = (t: Template) => {
    setName(t.name)
    setSubject(t.subject)
    setBodyHtml(t.body_html)
    setEditingId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await api.delete(`/api/templates/${id}`)
    loadTemplates()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
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
            onClick={() => { resetForm(); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            New Template
          </button>
        </div>
      </div>

      {/* template form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-3">{editingId ? 'Edit Template' : 'Create Template'}</h2>
          <p className="text-xs text-gray-400 mb-3">Use {'{{variable}}'} syntax for dynamic content</p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Subject (e.g. Welcome {{name}}!)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <textarea
              placeholder="HTML body (e.g. <h1>Hello {{name}}</h1>)"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-40 font-mono"
              required
            />
            {/* live preview */}
            {bodyHtml && (
              <div className="border rounded p-3">
                <p className="text-xs text-gray-400 mb-2">Preview:</p>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* template list */}
      <div className="bg-white rounded-lg shadow">
        {templates.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No templates yet</p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="p-4 border-b last:border-0 flex justify-between items-start">
              <div>
                <h3 className="font-medium">{t.name}</h3>
                <p className="text-sm text-gray-500">Subject: {t.subject}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(t)} className="text-blue-600 text-sm hover:underline">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-red-500 text-sm hover:underline">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
