// exceljs is large (it pulls in a full spreadsheet writer) and is only ever
// needed once someone actually clicks an export button, so it's loaded on
// demand here instead of being bundled into every page that could export.

const HEADER_FILL = 'FF962C30' // app's own maroon (see tailwind.config.js `primary`)
const BORDER = { style: 'thin', color: { argb: 'FFE0E0E0' } }

// Today: builds the .xlsx workbook client-side with ExcelJS.
//
// Later: the SRS calls for an official eGA template produced server-side by
// the Laravel API — when that endpoint exists, swap the body of this
// function for a call to it (download the returned file) instead of
// building the workbook locally. `sheets` shape (name/columns/rows) is kept
// deliberately simple so it maps onto a backend response just as easily.
//
// `download` defaults to true (existing callers — e.g. the Audit Log export
// — keep triggering an immediate save). Passing `download: false` skips the
// save and hands back `{ blob }` instead, for a caller that wants to show a
// confirmation/preview step before the file actually saves.
export async function exportExcel({ sheets, filename, download = true }) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  sheets.forEach(({ name, columns, rows }) => {
    const worksheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
    worksheet.columns = columns

    const header = worksheet.getRow(1)
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
      cell.alignment = { vertical: 'middle' }
    })
    header.height = 20

    worksheet.addRows(rows)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
      })
      if (rowNumber % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF7F2' } }
        })
      }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  if (!download) {
    return { blob }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return { blob }
}

// Renders an already-mounted DOM node (not an HTML string, unlike
// pdfExport.js's exportPdf) straight to a PDF blob and hands it back
// instead of triggering a download — the caller previews it first (an
// iframe pointed at the blob URL) and only writes it to disk once someone
// explicitly clicks Download.
export async function exportReport({ element, filename, openInNewTab = false }) {
  const { default: html2pdf } = await import('html2pdf.js')
  const blob = await html2pdf()
    .set({
      margin: [14, 12],
      filename,
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'avoid-all'] },
    })
    .from(element)
    .outputPdf('blob')

  if (openInNewTab) {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return { blob }
}
