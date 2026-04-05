import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useProject } from '../context/ProjectContext'
import CreateJobModal from '../components/CreateJobModal'
import Toast from '../components/Toast'

interface Job {
  id: string
  type: string
  cron_expr: string | null
  next_run_at: string | null
  status: string
  callback_url: string | null
  created_at: string
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-800',
}

export default function Jobs() {
  const { currentProject } = useProject()
  const [jobs, setJobs] = useState<Job[]>([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (currentProject) loadJobs()
  }, [currentProject])

  const loadJobs = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/jobs/${currentProject.id}`)
      setJobs(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCancel = async (jobId: string) => {
    if (!confirm('Cancel this job?')) return
    try {
      await api.delete(`/api/jobs/${jobId}`)
      setToast('Job cancelled')
      loadJobs()
    } catch (err: any) {
      setToast(err.response?.data?.detail || 'Failed to cancel')
    }
  }

  const handleCreated = () => {
    setShowModal(false)
    setToast('Job created!')
    loadJobs()
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Create a project first.</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Jobs</h1>
          <Link to="/dlq" className="text-sm text-red-500 hover:underline">Dead Letter Queue</Link>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Create Job
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 font-medium text-gray-600">Schedule</th>
              <th className="px-4 py-3 font-medium text-gray-600">Next Run</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No jobs scheduled yet
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${job.type === 'http' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {job.cron_expr || 'one-time'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[job.status] || 'bg-gray-100'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/jobs/${job.id}`} className="text-blue-600 text-xs hover:underline">
                        History
                      </Link>
                      {job.status === 'active' && (
                        <button onClick={() => handleCancel(job.id)} className="text-red-500 text-xs hover:underline">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateJobModal
          projectId={currentProject.id}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
