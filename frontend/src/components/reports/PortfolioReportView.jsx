import { forwardRef } from 'react'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import { activityResponsibleName } from '../../lib/activityPerson'
import { formatDate } from '../../lib/dates'

const PRIMARY = '#962c30'
const REPORT_WIDTH = 1100

const th = {
  border: '1px solid #d1d5db',
  padding: '6px 8px',
  textAlign: 'left',
  color: '#fff',
  background: PRIMARY,
  fontSize: 10,
  fontWeight: 600,
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
}

const td = {
  border: '1px solid #d1d5db',
  padding: '6px 8px',
  fontSize: 10,
  verticalAlign: 'top',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  margin: 0,
}

const rowStyle = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
}

const WORKFLOW_STATUS_LABEL = {
  'Plan Submitted': 'Pending Review',
}

function projectWorkflowLabel(project) {
  const raw = project?.status || ''
  return WORKFLOW_STATUS_LABEL[raw] || raw || '—'
}

function formatMoney(value) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function dateRange(start, end) {
  return (
    <span style={{ display: 'block', lineHeight: 1.35 }}>
      <span style={{ display: 'block' }}>{formatDate(start)}</span>
      <span style={{ display: 'block', color: '#6b7280' }}>→ {formatDate(end)}</span>
    </span>
  )
}

/**
 * One heading + one table as a single unit. Title is a <caption> so the print
 * engine cannot park it alone at the bottom of a page. We never split one
 * logical table into multiple <table>s (that was injecting duplicate headers).
 */
function TableBlock({
  title,
  titleAs = 'h3',
  columns,
  rows,
  emptyText,
  keepIntact = false,
  style,
}) {
  const colCount = columns.length
  const captionSize = titleAs === 'h2' ? 14 : 12

  return (
    <div
      className={`table-container${keepIntact ? ' pdf-keep-together' : ''}`}
      style={{
        marginBottom: 16,
        pageBreakInside: keepIntact ? 'avoid' : 'auto',
        breakInside: keepIntact ? 'avoid' : 'auto',
        ...style,
      }}
    >
      <table style={tableStyle}>
        {title ? (
          <caption
            style={{
              captionSide: 'top',
              textAlign: 'left',
              margin: '0 0 8px',
              padding: 0,
              fontSize: captionSize,
              fontWeight: 700,
              color: PRIMARY,
              pageBreakAfter: 'avoid',
              breakAfter: 'avoid',
            }}
          >
            {title}
          </caption>
        ) : null}
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr style={rowStyle}>
            {columns.map((column) => (
              <th key={column.key} style={th}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr style={rowStyle}>
              <td style={td} colSpan={colCount}>
                {emptyText || '—'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} style={rowStyle}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${columns[index]?.key || index}`} style={td}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

const PortfolioReportView = forwardRef(function PortfolioReportView(
  {
    projects = [],
    includeActivities = true,
    includeDocuments = false,
    includeRequirements = false,
    filtersLabel = 'All available projects',
  },
  ref,
) {
  const portfolioColumns = [
    { key: 'sn', label: 'SN', width: '4%' },
    { key: 'project', label: 'Project', width: '22%' },
    { key: 'apr', label: 'APR', width: '12%' },
    { key: 'category', label: 'Category', width: '10%' },
    { key: 'track', label: 'Track', width: '7%' },
    { key: 'stage', label: 'Stage', width: '10%' },
    { key: 'planner', label: 'Planner', width: '14%' },
    { key: 'status', label: 'Status', width: '11%' },
    { key: 'budget', label: 'Budget (TZS)', width: '10%' },
  ]

  return (
    <div
      ref={ref}
      style={{
        width: REPORT_WIDTH,
        maxWidth: REPORT_WIDTH,
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#111827',
        padding: 24,
        fontFamily: 'Arial, Helvetica, sans-serif',
        overflow: 'visible',
      }}
    >
      <div style={{ borderBottom: `4px solid ${PRIMARY}`, paddingBottom: 12, marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 20, color: PRIMARY }}>PMMS Portfolio Report</h1>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6b7280' }}>
          Generated {dayjs().format('MMMM D, YYYY h:mm A')}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>Scope: {filtersLabel}</p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
          {projects.length} project{projects.length === 1 ? '' : 's'} included
        </p>
      </div>

      <TableBlock
        title="Portfolio summary"
        titleAs="h2"
        columns={portfolioColumns}
        emptyText="No projects selected."
        keepIntact={projects.length <= 12}
        rows={projects.map((project, index) => ({
          key: project.id,
          cells: [
            index + 1,
            project.name,
            project.annual_plan_reference || '—',
            project.category || '—',
            project.review_track || project.workflow?.review_track || '—',
            project.lifecycle_stage || project.phase || '—',
            project.planner?.name || '—',
            projectWorkflowLabel(project),
            formatMoney(project.budget),
          ],
        }))}
      />

      <h2
        style={{
          margin: '8px 0 14px',
          fontSize: 14,
          color: PRIMARY,
          pageBreakAfter: 'avoid',
          breakAfter: 'avoid',
        }}
      >
        Project Summary
      </h2>

      {projects.map((project, projectIndex) => {
        const activities = project.activities || []
        const documents = project.documents || []
        const requirements = project.requirements || []

        return (
          <section
            key={project.id}
            className="report-project"
            style={{
              marginBottom: 28,
              paddingBottom: 8,
              pageBreakInside: 'auto',
              breakInside: 'auto',
            }}
          >
            {/* Title + compact summary stay on one page together */}
            <div
              className="table-container pdf-keep-together"
              style={{
                marginBottom: 14,
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                pageBreakAfter: 'avoid',
                breakAfter: 'avoid',
              }}
            >
              <h2
                style={{
                  margin: '0 0 10px',
                  fontSize: 13,
                  color: PRIMARY,
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid',
                }}
              >
                {projectIndex + 1}. {project.name}
              </h2>

              <table style={tableStyle}>
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '72%' }} />
                </colgroup>
                <tbody>
                  {[
                    ['Planner', project.planner?.name || '—'],
                    ['Project status', projectWorkflowLabel(project)],
                    ['Budget (TZS)', formatMoney(project.budget)],
                    [
                      'Planned dates',
                      `${formatDate(project.planned_start_date)} → ${formatDate(project.planned_end_date)}`,
                    ],
                  ].map(([label, value]) => (
                    <tr key={label} style={rowStyle}>
                      <td style={{ ...td, fontWeight: 600, background: '#f9fafb' }}>{label}</td>
                      <td style={td}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {includeActivities ? (
              <TableBlock
                title="Implementation activities"
                columns={[
                  { key: 'sn', label: 'SN', width: '4%' },
                  { key: 'activity', label: 'Activity', width: '18%' },
                  { key: 'planned', label: 'Planned', width: '12%' },
                  { key: 'actual', label: 'Actual', width: '12%' },
                  { key: 'deliverable', label: 'Deliverable', width: '22%' },
                  { key: 'responsible', label: 'Responsible', width: '16%' },
                  { key: 'status', label: 'Status', width: '16%' },
                ]}
                emptyText="No activities recorded."
                keepIntact={activities.length <= 6}
                rows={activities.map((activity, index) => ({
                  key: activity.id || `activity-${index}`,
                  cells: [
                    index + 1,
                    activity.name,
                    dateRange(activity.planned_start_date, activity.planned_end_date),
                    dateRange(activity.actual_start_date, activity.actual_end_date),
                    activity.expected_deliverable || '—',
                    activityResponsibleName(activity),
                    STATUS[deriveStatus(activity)].label,
                  ],
                }))}
              />
            ) : null}

            {includeDocuments ? (
              <TableBlock
                title="Documents"
                columns={[
                  { key: 'file', label: 'File', width: '40%' },
                  { key: 'type', label: 'Type', width: '25%' },
                  { key: 'version', label: 'Version', width: '12%' },
                  { key: 'review', label: 'Review status', width: '23%' },
                ]}
                emptyText="No documents uploaded."
                keepIntact={documents.length <= 8}
                rows={documents.map((document) => ({
                  key: document.id,
                  cells: [
                    document.file_name || document.name || '—',
                    document.document_type || '—',
                    document.version_number != null ? `v${document.version_number}` : '—',
                    document.review_status || '—',
                  ],
                }))}
              />
            ) : null}

            {includeRequirements ? (
              <TableBlock
                title="Traceability matrix"
                columns={[
                  { key: 'code', label: 'Code', width: '14%' },
                  { key: 'description', label: 'Description', width: '52%' },
                  { key: 'status', label: 'Status', width: '18%' },
                  { key: 'test', label: 'Test result', width: '16%' },
                ]}
                emptyText="No requirements recorded."
                keepIntact={requirements.length <= 8}
                rows={requirements.map((requirement) => ({
                  key: requirement.id,
                  cells: [
                    requirement.requirement_code,
                    requirement.description,
                    requirement.implementation_status || '—',
                    requirement.test_result || 'not_tested',
                  ],
                }))}
              />
            ) : null}
          </section>
        )
      })}
    </div>
  )
})

export default PortfolioReportView
