// exceljs is large (it pulls in a full spreadsheet writer) and is only ever
// needed once someone actually clicks an export button, so it's loaded on
// demand here instead of being bundled into every page that could export.

// Today: builds the .xlsx workbook client-side with ExcelJS.
//
// Later: the SRS calls for an official eGA template produced server-side by
// the Laravel API — when that endpoint exists, swap the body of this
// function for a call to it (download the returned file) instead of
// building the workbook locally. `sheets` shape (name/columns/rows) is kept
// deliberately simple so it maps onto a backend response just as easily.
export async function exportExcel({ sheets, filename }) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  sheets.forEach(({ name, columns, rows }) => {
    const worksheet = workbook.addWorksheet(name)
    worksheet.columns = columns
    worksheet.addRows(rows)
    worksheet.getRow(1).font = { bold: true }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
