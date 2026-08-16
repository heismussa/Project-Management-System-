import { useRef, useState } from 'react'
import { Button } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import html2pdf from 'html2pdf.js'
import ReportView from './ReportView'

function ExportReportButton({ activities, requirements }) {
  const reportRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `progress-report-${todayISO()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .save()
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button type="primary" icon={<FilePdfOutlined />} loading={exporting} onClick={handleExport}>
        Export progress report
      </Button>
      <ReportView ref={reportRef} activities={activities} requirements={requirements} />
    </>
  )
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default ExportReportButton
