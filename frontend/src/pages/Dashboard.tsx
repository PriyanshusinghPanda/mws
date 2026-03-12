import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([])
  const [newName, setNewName] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const res = await api.get('/api/projects')
      setProjects(res.data)
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
      loadProjects()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Create
          </button>
        </form>
      </div>

      {/* projects list */}
      <div className="bg-white rounded-lg shadow">
        <h2 className="font-semibold p-4 border-b">Your Projects</h2>
        {projects.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm">No projects yet. Create one above.</p>
        ) : (
          <ul>
            {projects.map((p) => (
              <li key={p.id} className="px-4 py-3 border-b last:border-0 flex justify-between items-center">
                <span className="font-medium">{p.name}</span>
                <Link to="/emails" className="text-blue-600 text-sm hover:underline">
                  View Emails
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
