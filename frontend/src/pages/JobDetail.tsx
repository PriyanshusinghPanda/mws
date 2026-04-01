import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'

interface JobData {
  id: string
  type: string
  cron_expr: string | null
  next_run_at: string | null
  status: string
  callback_url: string | null
  created_at: string
}

interface JobRun {
  id: string
  status: string
  attempt: number
  duration_ms: number | null
  error_message: string | null
  started_at: string
}

const runStatusColors: Record<string, string> = {
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function JobDetail() {
  const { jobId } = useParams()
  const [job, setJob] = useState<JobData | null>(null)
  const [runs, setRuns] = useState<JobRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJob()
    loadRuns()
  }, [jobId])

  const loadJob = async () => {
    try {
      const res = await api.get(`/api/jobs/detail/${jobId}`)
      setJob(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadRuns = async () => {
    try {
      const res = await api.get(`/api/jobs/runs/${jobId}`)
      setRuns(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <p className="text-gray-400">Loading...</p>
  if (!job) return <p className="text-red-500">Job not found</p>

  return (
    <div>
      <Link to="/jobs" className="text-blue-600 text-sm hover:underline mb-4 inline-block">
        &larr; Back to jobs
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold capitalize">{job.type} Job</h1>
          <span className={`px-3 py-1 rounded text-sm font-medium ${job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {job.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Schedule</p>
            <p className="font-mono">{job.cron_expr || 'One-time'}</p>
          </div>
          <div>
            <p className="text-gray-500">Next Run</p>
            <p>{job.next_run_at ? new Date(job.next_run_at).toLocaleString() : '—'}</p>
          </div>
          {job.callback_url && (
            <div className="col-span-2">
              <p className="text-gray-500">Webhook URL</p>
              <p className="font-mono text-xs break-all">{job.callback_url}</p>
            </div>
          )}
        </div>
      </div>

      {/* run history */}
      <h2 className="text-lg font-semibold mb-3">Run History</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Attempt</th>
              <th className="px-4 py-3 font-medium text-gray-600">Duration</th>
              <th className="px-4 py-3 font-medium text-gray-600">Error</th>
              <th className="px-4 py-3 font-medium text-gray-600">Started</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No runs yet
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${runStatusColors[run.status] || 'bg-gray-100'}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{run.attempt}</td>
                  <td className="px-4 py-3">{run.duration_ms ? `${run.duration_ms}ms` : '—'}</td>
                  <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{run.error_message || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(run.started_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
