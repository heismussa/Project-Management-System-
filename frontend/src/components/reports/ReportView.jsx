import { forwardRef } from 'react'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import { getPersonName } from '../../data/people'
import { getRequirementStatus } from '../matrix/requirementStatus'

const th = 'border border-gray-300 p-2 text-left text-white'
const td = 'border border-gray-300 p-2'

const ReportView = forwardRef(function ReportView(
  { activities, requirements, progressUpdates, documents },
  ref,
) {
  const scoredRequirements = requirements.map((requirement) => ({
    ...requirement,
    implementation_status: getRequirementStatus(requirement.id, progressUpdates),
  }))
  const completed = scoredRequirements.filter((r) => r.implementation_status === 'completed').length
  const percent = requirements.length === 0 ? 0 : Math.round((completed / requirements.length) * 100)

  return (
    <div ref={ref} className="fixed left-[-10000px] top-0 w-[850px] bg-white p-8 text-gray-900">
      <div className="border-b-4 border-primary pb-4">
        <h1 className="text-2xl font-bold text-primary">Project Progress Report</h1>
        <p className="mt-1 text-sm text-gray-500">Generated {dayjs().format('MMMM D, YYYY h:mm A')}</p>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-primary">Overall completion: {percent}%</h2>
      <p className="text-sm text-gray-600">
        {completed} of {requirements.length} SRS requirements completed
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">Implementation Plan &amp; Deliverables</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary">
            <th className={th}>Activity</th>
            <th className={th}>Deliverable</th>
            <th className={th}>Planned</th>
            <th className={th}>Actual</th>
            <th className={th}>Responsible</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className={td}>{activity.name}</td>
              <td className={td}>{activity.expected_deliverable}</td>
              <td className={td}>
                {activity.planned_start_date} → {activity.planned_end_date}
              </td>
              <td className={td}>
                {activity.actual_start_date || '—'} → {activity.actual_end_date || '—'}
              </td>
              <td className={td}>{getPersonName(activity.responsible_person_id)}</td>
              <td className={td}>{STATUS[deriveStatus(activity)].label}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">SRS Traceability Matrix</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary">
            <th className={th}>Code</th>
            <th className={th}>Description</th>
            <th className={th}>Status</th>
            <th className={th}>Test result</th>
          </tr>
        </thead>
        <tbody>
          {scoredRequirements.map((requirement) => (
            <tr key={requirement.id}>
              <td className={td}>{requirement.requirement_code}</td>
              <td className={td}>{requirement.description}</td>
              <td className={td}>{STATUS[requirement.implementation_status].label}</td>
              <td className={td}>{requirement.test_result ?? 'not_tested'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">Project Documents</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary">
            <th className={th}>File name</th>
            <th className={th}>Type</th>
            <th className={th}>Version</th>
            <th className={th}>Review status</th>
            <th className={th}>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td className={td}>{document.file_name}</td>
              <td className={td}>{document.document_type}</td>
              <td className={td}>v{document.version_number}</td>
              <td className={td}>{document.review_status}</td>
              <td className={td}>{dayjs(document.uploaded_at).format('MMM D, YYYY')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default ReportView
