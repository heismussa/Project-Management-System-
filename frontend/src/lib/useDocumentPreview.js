import { useState } from 'react'
import { message } from 'antd'
import { fetchAuthorizedFile } from './apiHelpers'

const MAX_PREVIEW_ROWS = 300

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ))
}

async function worksheetToHtmlTable(buffer) {
  // Both libraries are dynamically imported (here and in viewDocument below)
  // rather than imported at the top of the file — mammoth alone is ~500KB,
  // and loading it eagerly meant every page paid for it on load even if
  // nobody ever opened a document. This way it's only fetched the first
  // time someone actually clicks View on a docx/xlsx file.
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return '<p>This workbook has no sheets.</p>'

  const rowCount = Math.min(sheet.rowCount, MAX_PREVIEW_ROWS)
  const rowsHtml = []
  for (let r = 1; r <= rowCount; r += 1) {
    const row = sheet.getRow(r)
    const cellsHtml = []
    for (let c = 1; c <= sheet.columnCount; c += 1) {
      const cell = row.getCell(c)
      const tag = r === 1 ? 'th' : 'td'
      cellsHtml.push(`<${tag}>${escapeHtml(cell.text)}</${tag}>`)
    }
    rowsHtml.push(`<tr>${cellsHtml.join('')}</tr>`)
  }

  const truncatedNote = sheet.rowCount > MAX_PREVIEW_ROWS
    ? `<p style="color:#9CA3AF;font-size:12px;margin-top:8px;">Showing the first ${MAX_PREVIEW_ROWS} of ${sheet.rowCount} rows — use Download for the full sheet.</p>`
    : ''

  return `<table style="border-collapse:collapse;width:100%;font-size:13px;">${rowsHtml.join('')}</table>${truncatedNote}`
}

function extensionOf(fileName) {
  return (fileName || '').toLowerCase().split('.').pop()
}

/**
 * Opening a document used to fetch it, then window.open() the resulting
 * blob URL in a new tab. Browsers only allow window.open() to reliably open
 * a real tab when it's called synchronously inside the click itself — by
 * the time the fetch above resolves, that window has closed, so the popup
 * either gets silently blocked or the browser falls back to downloading the
 * blob instead of displaying it. Rendering the file in an in-page modal
 * sidesteps popups entirely — a PDF goes in an iframe, and docx/xlsx are
 * converted client-side (mammoth / ExcelJS) into plain HTML so they can be
 * previewed the same way instead of only ever offering a download.
 */
export function useDocumentPreview() {
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewHtml, setPreviewHtml] = useState(null)
  const [previewKind, setPreviewKind] = useState(null) // 'pdf' | 'html' | 'unsupported'
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const viewDocument = async (doc) => {
    setPreviewDoc(doc)
    setPreviewUrl(null)
    setPreviewHtml(null)
    setPreviewKind(null)
    setPreviewLoading(true)
    try {
      const blob = await fetchAuthorizedFile(doc.id)
      const ext = extensionOf(doc.file_name)

      if (ext === 'pdf') {
        setPreviewUrl(URL.createObjectURL(blob))
        setPreviewKind('pdf')
      } else if (ext === 'docx') {
        const arrayBuffer = await blob.arrayBuffer()
        const mammoth = await import('mammoth')
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
        setPreviewHtml(html)
        setPreviewKind('html')
      } else if (ext === 'xlsx') {
        const arrayBuffer = await blob.arrayBuffer()
        const html = await worksheetToHtmlTable(arrayBuffer)
        setPreviewHtml(html)
        setPreviewKind('html')
      } else {
        setPreviewKind('unsupported')
      }
    } catch {
      message.error('Could not open document.')
      setPreviewDoc(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewDoc(null)
    setPreviewUrl(null)
    setPreviewHtml(null)
    setPreviewKind(null)
  }

  const downloadDocument = async (doc) => {
    setDownloadingId(doc.id)
    try {
      const blob = await fetchAuthorizedFile(doc.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name || 'document'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Could not download document.')
    } finally {
      setDownloadingId(null)
    }
  }

  return {
    previewDoc,
    previewUrl,
    previewHtml,
    previewKind,
    previewLoading,
    downloadingId,
    viewDocument,
    closePreview,
    downloadDocument,
  }
}
