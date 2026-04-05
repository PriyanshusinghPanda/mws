import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'

interface DLQEntry {
  id: string
  job_run_id: string
  reason: string
  resolution: string | null
  created_at: string
}

export default function DeadLetterQueue() {
  const { currentProject } = useProject()
  const [entries, setEntries] = useState<DLQEntry[]>([])

  useEffect(() => {
    if (currentProject) loadDLQ()
  }, [currentProject])

  const loadDLQ = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/jobs/dlq/${currentProject.id}`)
      setEntries(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  if (!currentProject) {
    return <p className="text-gray-500">Create a project first.</p>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dead Letter Queue</h1>
        <Link to="/jobs" className="text-blue-600 text-sm hover:underline">&larr; Back to Jobs</Link>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Jobs that failed all {3} retry attempts end up here.
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Run ID</th>
              <th className="px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="px-4 py-3 font-medium text-gray-600">Resolution</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No failed jobs — that's a good thing!
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{entry.job_run_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-red-600 text-xs max-w-md">{entry.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${entry.resolution ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {entry.resolution || 'unresolved'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
