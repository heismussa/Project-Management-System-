import { forwardRef } from 'react'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import { activityResponsibleName } from '../../lib/activityPerson'
import { formatDate } from '../../lib/dates'

const MAROON = '#962c30'
const BORDER = '#e0dede'
const STRIPE = '#faf7f2'

const th = {
  background: MAROON,
  color: '#fff',
  textAlign: 'left',
  padding: '7px 10px',
  fontSize: 10.5,
  fontWeight: 700,
}

function td(striped) {
  return {
    padding: '7px 10px',
    fontSize: 10.5,
    borderBottom: `1px solid ${BORDER}`,
    background: striped ? STRIPE : '#fff',
  }
}

function dateRange(start, end) {
  if (!start && !end) return '—'
  return `${formatDate(start) || '—'} → ${formatDate(end) || '—'}`
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: MAROON,
        borderBottom: `2px solid ${MAROON}`,
        paddingBottom: 4,
        margin: '14px 0 8px',
      }}
    >
      {children}
    </div>
  )
}

function EmptyNote({ children }) {
  return <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: 11, margin: '4px 0 14px' }}>{children}</p>
}

function ActivitiesTable({ activities }) {
  if (!activities.length) return <EmptyNote>No activities recorded.</EmptyNote>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr>
          {['Activity', 'Planned', 'Actual', 'Deliverable', 'Responsible', 'Status'].map((h) => (
            <th key={h} style={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activities.map((activity, index) => (
          <tr key={activity.id ?? index}>
            <td style={td(index % 2 === 1)}>{activity.name}</td>
            <td style={td(index % 2 === 1)}>{dateRange(activity.planned_start_date, activity.planned_end_date)}</td>
            <td style={td(index % 2 === 1)}>{dateRange(activity.actual_start_date, activity.actual_end_date)}</td>
            <td style={td(index % 2 === 1)}>{activity.expected_deliverable || '—'}</td>
            <td style={td(index % 2 === 1)}>{activityResponsibleName(activity)}</td>
            <td style={td(index % 2 === 1)}>{STATUS[deriveStatus(activity)].label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DocumentsTable({ documents }) {
  if (!documents.length) return <EmptyNote>No documents uploaded.</EmptyNote>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr>
          {['File', 'Type', 'Version', 'Review status'].map((h) => (
            <th key={h} style={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {documents.map((document, index) => (
          <tr key={document.id ?? index}>
            <td style={td(index % 2 === 1)}>{document.file_name || document.name || '—'}</td>
            <td style={td(index % 2 === 1)}>{document.document_type || 'Document'}</td>
            <td style={td(index % 2 === 1)}>{document.version_number != null ? `v${document.version_number}` : '—'}</td>
            <td style={td(index % 2 === 1)}>{document.review_status || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RequirementsTable({ requirements }) {
  if (!requirements.length) return <EmptyNote>No requirements recorded.</EmptyNote>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr>
          {['Code', 'Description', 'Status', 'Test result'].map((h) => (
            <th key={h} style={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requirements.map((requirement, index) => (
          <tr key={requirement.id ?? index}>
            <td style={td(index % 2 === 1)}>{requirement.requirement_code}</td>
            <td style={td(index % 2 === 1)}>{requirement.description}</td>
            <td style={td(index % 2 === 1)}>{requirement.implementation_status || '—'}</td>
            <td style={td(index % 2 === 1)}>{requirement.test_result || 'not_tested'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * The actual printable document behind "Generate PDF" on the Reports page —
 * rendered off-screen and handed to html2pdf as a live DOM node (not an
 * HTML string), so this is the single source of truth for what the PDF
 * looks like: change this component and the preview/PDF change together.
 */
const PortfolioReportView = forwardRef(function PortfolioReportView(
  { projects, includeActivities, includeDocuments, includeRequirements, filtersLabel },
  ref,
) {
  return (
    <div ref={ref} style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", color: '#1F2937', background: '#fff', padding: 24 }}>
      <div style={{ borderBottom: `4px solid ${MAROON}`, paddingBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: MAROON }}>Project Portfolio Report</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          Generated {dayjs().format('MMMM D, YYYY h:mm A')}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
          {filtersLabel} · {projects.length} project{projects.length === 1 ? '' : 's'}
        </div>
      </div>

      {projects.length === 0 && <EmptyNote>No projects selected.</EmptyNote>}

      {projects.map((project) => (
        <div key={project.id} style={{ marginTop: 20, pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {[project.category, project.review_track || project.workflow?.review_track, project.status, project.planner?.name]
              .filter(Boolean)
              .join(' · ')}
          </div>

          {includeActivities && (
            <>
              <SectionTitle>Implementation Activities ({project.activities.length})</SectionTitle>
              <ActivitiesTable activities={project.activities} />
            </>
          )}
          {includeDocuments && (
            <>
              <SectionTitle>Documents ({project.documents.length})</SectionTitle>
              <DocumentsTable documents={project.documents} />
            </>
          )}
          {includeRequirements && (
            <>
              <SectionTitle>Traceability Matrix ({project.requirements.length})</SectionTitle>
              <RequirementsTable requirements={project.requirements} />
            </>
          )}
        </div>
      ))}
    </div>
  )
})

export default PortfolioReportView
