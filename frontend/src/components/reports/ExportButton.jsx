import { useRef, useState } from 'react'
import { Button } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import { exportReport } from '../../lib/reportExport'
import ReportView from './ReportView'

function ExportButton({ activities, requirements, progressUpdates, documents }) {
  const reportRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportReport({
        element: reportRef.current,
        filename: `progress-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button type="primary" icon={<FilePdfOutlined />} loading={exporting} onClick={handleExport}>
        Export Progress Report
      </Button>
      <ReportView
        ref={reportRef}
        activities={activities}
        requirements={requirements}
        progressUpdates={progressUpdates}
        documents={documents}
      />
    </>
  )
}

export default ExportButton
