import html2pdf from 'html2pdf.js'
import ExcelJS from 'exceljs'

// Today: renders the printable report DOM node to a PDF client-side.
//
// Later: the SRS calls for an official eGA template (PDF + Excel) produced
// server-side by the Laravel API. When that endpoint exists, swap the body
// of this function for a call to it (download the returned file) instead
// of running html2pdf locally. Callers only depend on this function's
// signature — callers won't need to change.
export async function exportReport({ element, filename }) {
  await html2pdf()
    .set({
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save()
}

// Today: builds the .xlsx workbook client-side with ExcelJS.
//
// Later: same swap-point as exportReport() above — replace the body with a
// call to the Laravel API's official eGA Excel template endpoint and
// download the returned file. `sheets` shape (name/columns/rows) is kept
// deliberately simple so it maps onto a backend response just as easily.
export async function exportExcel({ sheets, filename }) {
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
