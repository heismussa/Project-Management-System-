import { forwardRef } from 'react'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import { activityResponsibleName } from '../../lib/activityPerson'
import { formatDate } from '../../lib/dates'

const th = 'border border-gray-300 p-2 text-left text-white'
const td = 'border border-gray-300 p-2'

// Mirrors ActivitiesTable.jsx's columns/labels 1:1 so the exported document
// matches what's shown on screen instead of drifting into its own layout.
const ImplementationPlanView = forwardRef(function ImplementationPlanView({ activities }, ref) {
  return (
    <div
      ref={ref}
      className="fixed left-0 top-0 -z-50 w-[950px] bg-white p-8 text-gray-900"
      style={{ pointerEvents: 'none' }}
    >
      <div className="border-b-4 border-primary pb-4">
        <h1 className="text-2xl font-bold text-primary">Project Management Plan</h1>
        <p className="mt-1 text-sm text-gray-500">Generated {dayjs().format('MMMM D, YYYY h:mm A')}</p>
      </div>

      <table className="mt-6 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary">
            <th className={th}>Activity Done</th>
            <th className={th}>Planned Start</th>
            <th className={th}>Planned End</th>
            <th className={th}>Actual Start</th>
            <th className={th}>Actual End</th>
            <th className={th}>Expected Deliverable</th>
            <th className={th}>Responsible Person</th>
            <th className={th}>Project Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className={td}>{activity.name}</td>
              <td className={td}>{formatDate(activity.planned_start_date)}</td>
              <td className={td}>{formatDate(activity.planned_end_date)}</td>
              <td className={td}>{formatDate(activity.actual_start_date)}</td>
              <td className={td}>{formatDate(activity.actual_end_date)}</td>
              <td className={td}>{activity.expected_deliverable}</td>
              <td className={td}>{activityResponsibleName(activity)}</td>
              <td className={td}>{STATUS[deriveStatus(activity)].label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default ImplementationPlanView
