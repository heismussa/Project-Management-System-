import { forwardRef } from 'react'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import { getPersonName, getPersonRole } from '../../data/people'

const th = 'border border-gray-300 p-2 text-left text-white'
const td = 'border border-gray-300 p-2'

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
            <th className={th}>Phase</th>
            <th className={th}>Activity</th>
            <th className={th}>Expected Deliverable</th>
            <th className={th}>Planned</th>
            <th className={th}>Actual</th>
            <th className={th}>Responsible</th>
            <th className={th}>Role</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className={td}>{activity.phase ?? '—'}</td>
              <td className={td}>{activity.name}</td>
              <td className={td}>{activity.expected_deliverable}</td>
              <td className={td}>
                {activity.planned_start_date} → {activity.planned_end_date}
              </td>
              <td className={td}>
                {activity.actual_start_date || '—'} → {activity.actual_end_date || '—'}
              </td>
              <td className={td}>{getPersonName(activity.responsible_person_id)}</td>
              <td className={td}>{getPersonRole(activity.responsible_person_id)}</td>
              <td className={td}>{STATUS[deriveStatus(activity)].label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default ImplementationPlanView
