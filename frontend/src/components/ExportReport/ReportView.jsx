import { forwardRef } from 'react'
import dayjs from 'dayjs'
import { deriveStatus } from '../ActivityTable/status'

const th = 'border border-gray-300 bg-gray-100 p-2 text-left'
const td = 'border border-gray-300 p-2'

const ReportView = forwardRef(function ReportView({ activities, requirements }, ref) {
  const completed = requirements.filter((r) => r.status === 'Completed').length
  const percent = requirements.length === 0 ? 0 : Math.round((completed / requirements.length) * 100)

  return (
    <div ref={ref} className="fixed left-[-10000px] top-0 w-[800px] bg-white p-8 text-gray-900">
      <h1 className="text-2xl font-bold">Project Progress Report</h1>
      <p className="mt-1 text-sm text-gray-500">Generated {dayjs().format('MMMM D, YYYY h:mm A')}</p>

      <h2 className="mt-6 text-lg font-semibold">Overall completion: {percent}%</h2>
      <p className="text-sm text-gray-600">
        {completed} of {requirements.length} SRS requirements completed
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Implementation Plan &amp; Deliverables</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={th}>Activity</th>
            <th className={th}>Deliverable</th>
            <th className={th}>Planned</th>
            <th className={th}>Actual</th>
            <th className={th}>Team</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className={td}>{activity.name}</td>
              <td className={td}>{activity.deliverable}</td>
              <td className={td}>
                {activity.plannedStart} → {activity.plannedEnd}
              </td>
              <td className={td}>
                {activity.actualStart || '—'} → {activity.actualEnd || '—'}
              </td>
              <td className={td}>{activity.team.join(', ')}</td>
              <td className={td}>{deriveStatus(activity.actualStart, activity.actualEnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-lg font-semibold">SRS Traceability Matrix</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={th}>Code</th>
            <th className={th}>Description</th>
            <th className={th}>Status</th>
            <th className={th}>Test result</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement) => (
            <tr key={requirement.id}>
              <td className={td}>{requirement.code}</td>
              <td className={td}>{requirement.description}</td>
              <td className={td}>{requirement.status}</td>
              <td className={td}>{requirement.testResult}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default ReportView
