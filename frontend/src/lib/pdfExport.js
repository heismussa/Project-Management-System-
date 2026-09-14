// html2pdf.js renders an off-screen HTML element to canvas and embeds it as
// a PDF page — same technique either export uses, so the actual "make it
// look right" work lives in the HTML builders below, not here.

const MAROON = '#962c30'
const BORDER = '#e0dede'
const STRIPE = '#faf7f2'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ))
}

function tableHtml(headers, rows, emptyLabel) {
  if (!rows.length) {
    return `<p style="font-style:italic;color:#6b7280;font-size:11px;margin:4px 0 18px;">${escapeHtml(emptyLabel)}</p>`
  }
  const headHtml = headers
    .map((h) => `<th style="background:${MAROON};color:#fff;text-align:left;padding:7px 10px;font-size:10.5px;font-weight:700;">${escapeHtml(h)}</th>`)
    .join('')
  const bodyHtml = rows
    .map((cells, i) => {
      const bg = i % 2 === 1 ? STRIPE : '#fff'
      const cellsHtml = cells
        .map((c) => `<td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid ${BORDER};background:${bg};">${escapeHtml(c ?? '—')}</td>`)
        .join('')
      return `<tr style="page-break-inside:avoid;">${cellsHtml}</tr>`
    })
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:18px;"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
}

function sectionTitle(text) {
  return `<div style="font-size:13px;font-weight:700;color:${MAROON};border-bottom:2px solid ${MAROON};padding-bottom:4px;margin:18px 0 10px;">${escapeHtml(text)}</div>`
}

function dateRange(start, end) {
  if (!start && !end) return '—'
  return `${start || '—'} to ${end || '—'}`
}

/** Same four sections as the backend's Word report (ProjectArchiveSummaryBuilder) — kept visually consistent so Word/PDF/Excel read as the same document in three formats. */
export function buildProjectReportHtml(project) {
  const activities = project.implementation_activities || project.implementationActivities || []
  const requirements = project.requirements || []
  const documents = (project.documents || []).filter((d) => d.is_current !== false)

  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1F2937;padding:8px;">
      <div style="font-size:20px;font-weight:700;color:${MAROON};">Project Summary</div>
      <div style="font-size:14px;font-weight:700;margin-top:4px;">${escapeHtml(project.name || 'Untitled project')}</div>

      ${sectionTitle('Details')}
      ${tableHtml(['Field', 'Value'], [
        ['Category', project.category],
        ['Type', project.project_type],
        ['Planner', project.planner?.name],
        ['Reviewer', project.reviewer?.name],
        ['Coordinator', project.coordinator?.name],
        ['Approver', project.approver?.name],
        ['Planned dates', dateRange(project.planned_start_date, project.planned_end_date)],
        ['Actual dates', dateRange(project.actual_start_date, project.actual_end_date)],
        ['Closed at', project.closed_at],
      ], 'No details recorded.')}

      ${sectionTitle(`Activities (${activities.length})`)}
      ${tableHtml(
        ['Activity', 'Planned', 'Actual', 'Status', 'Responsible'],
        activities.map((a) => [
          a.name,
          dateRange(a.planned_start_date, a.planned_end_date),
          dateRange(a.actual_start_date, a.actual_end_date),
          a.status,
          a.responsible_person?.name || a.responsiblePerson?.name,
        ]),
        'No activities recorded.',
      )}

      ${sectionTitle(`Requirements / RTM (${requirements.length})`)}
      ${tableHtml(
        ['Code', 'Description', 'Status', 'Test result'],
        requirements.map((r) => [r.requirement_code, r.description, r.implementation_status, r.test_result]),
        'No requirements recorded.',
      )}

      ${sectionTitle(`Documents included (${documents.length})`)}
      ${tableHtml(
        ['File', 'Type'],
        documents.map((d) => [d.file_name, d.document_type || 'Document']),
        'No documents attached.',
      )}
    </div>
  `
}

/** Mirrors the on-screen Reports table exactly — same rows the Excel export uses, so all three formats show the same filtered view. */
export function buildPortfolioReportHtml(rows) {
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1F2937;padding:8px;">
      <div style="font-size:20px;font-weight:700;color:${MAROON};">Project Portfolio</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">${rows.length} project${rows.length === 1 ? '' : 's'}</div>
      ${sectionTitle('Projects')}
      ${tableHtml(
        ['Project Name', 'Category', 'Status', 'Track', 'Planner', 'Budget', 'Queue'],
        rows.map((r) => [r.name, r.category, r.status, r.track, r.planner, r.budget, r.queue]),
        'No projects match the current filter.',
      )}
    </div>
  `
}

export async function exportPdf({ html, filename, orientation = 'portrait' }) {
  const { default: html2pdf } = await import('html2pdf.js')
  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0'
  container.style.width = orientation === 'landscape' ? '1100px' : '780px'
  container.style.background = '#fff'
  document.body.appendChild(container)
  try {
    await html2pdf()
      .set({
        margin: [14, 12],
        filename,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'pt', format: 'a4', orientation },
        pagebreak: { mode: ['css', 'avoid-all'] },
      })
      .from(container)
      .save()
  } finally {
    document.body.removeChild(container)
  }
}
