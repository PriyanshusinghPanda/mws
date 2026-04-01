import { useState } from 'react'
import api from '../lib/api'

interface Props {
  projectId: string
  onClose: () => void
  onCreated: () => void
}

const cronPresets = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'First of month', value: '0 0 1 * *' },
  { label: 'Custom', value: '' },
]

export default function CreateJobModal({ projectId, onClose, onCreated }: Props) {
  const [jobType, setJobType] = useState<'http' | 'email'>('http')
  const [scheduleType, setScheduleType] = useState<'cron' | 'once' | 'delay'>('cron')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [cronExpr, setCronExpr] = useState('0 9 * * *')
  const [cronPreset, setCronPreset] = useState('0 9 * * *')
  const [runAt, setRunAt] = useState('')
  const [delaySeconds, setDelaySeconds] = useState(60)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // email job fields
  const [toAddress, setToAddress] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  const handlePresetChange = (value: string) => {
    setCronPreset(value)
    if (value) setCronExpr(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      const payload: any = {
        project_id: projectId,
        type: jobType,
      }

      if (jobType === 'http') {
        payload.callback_url = callbackUrl
      } else {
        payload.payload = {
          to_address: toAddress,
          subject: emailSubject,
          body_html: emailBody,
        }
      }

      if (scheduleType === 'cron') {
        payload.cron_expr = cronExpr
      } else if (scheduleType === 'once') {
        payload.run_at = new Date(runAt).toISOString()
      } else {
        payload.delay_seconds = delaySeconds
      }

      await api.post('/api/jobs', payload)
      onCreated()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create job')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create Job</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* job type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Job Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setJobType('http')}
                className={`px-3 py-1 rounded text-sm ${jobType === 'http' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                HTTP Webhook
              </button>
              <button type="button" onClick={() => setJobType('email')}
                className={`px-3 py-1 rounded text-sm ${jobType === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                Send Email
              </button>
            </div>
          </div>

          {/* http job config */}
          {jobType === 'http' && (
            <input
              type="url"
              placeholder="Webhook URL (https://yourapp.com/api/hook)"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
          )}

          {/* email job config */}
          {jobType === 'email' && (
            <>
              <input type="email" placeholder="To address" value={toAddress}
                onChange={(e) => setToAddress(e.target.value)} className="border rounded px-3 py-2 text-sm" required />
              <input type="text" placeholder="Subject" value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)} className="border rounded px-3 py-2 text-sm" required />
              <textarea placeholder="Email body (HTML)" value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)} className="border rounded px-3 py-2 text-sm h-20" required />
            </>
          )}

          {/* schedule type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Schedule</label>
            <div className="flex gap-2">
              {(['cron', 'once', 'delay'] as const).map(t => (
                <button key={t} type="button" onClick={() => setScheduleType(t)}
                  className={`px-3 py-1 rounded text-sm capitalize ${scheduleType === t ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                  {t === 'cron' ? 'Recurring' : t === 'once' ? 'One-time' : 'Delayed'}
                </button>
              ))}
            </div>
          </div>

          {/* cron config */}
          {scheduleType === 'cron' && (
            <div className="flex flex-col gap-2">
              <select value={cronPreset} onChange={(e) => handlePresetChange(e.target.value)}
                className="border rounded px-3 py-2 text-sm">
                {cronPresets.map(p => (
                  <option key={p.label} value={p.value}>{p.label}{p.value ? ` (${p.value})` : ''}</option>
                ))}
              </select>
              <input type="text" placeholder="Cron expression" value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                className="border rounded px-3 py-2 text-sm font-mono" required />
            </div>
          )}

          {/* one-time config */}
          {scheduleType === 'once' && (
            <input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)}
              className="border rounded px-3 py-2 text-sm" required />
          )}

          {/* delay config */}
          {scheduleType === 'delay' && (
            <div className="flex items-center gap-2">
              <input type="number" value={delaySeconds} onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="border rounded px-3 py-2 text-sm w-24" min={1} required />
              <span className="text-sm text-gray-500">seconds from now</span>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
