import { useRef, useState } from 'react'
import { Dropdown, Button, message } from 'antd'
import { DownOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons'
import { exportReport, exportExcel } from '../../lib/reportExport'
import { STATUS, deriveStatus } from '../../lib/status'
import { activityResponsibleName } from '../../lib/activityPerson'
import { formatDate } from '../../lib/dates'
import ImplementationPlanView from './ImplementationPlanView'

// Mirrors ActivitiesTable.jsx's columns/labels 1:1 so the exported document
// matches what's shown on screen instead of drifting into its own layout.
const EXCEL_COLUMNS = [
  { header: 'Activity Done', key: 'activity', width: 32 },
  { header: 'Planned Start', key: 'plannedStart', width: 14 },
  { header: 'Planned End', key: 'plannedEnd', width: 14 },
  { header: 'Actual Start', key: 'actualStart', width: 14 },
  { header: 'Actual End', key: 'actualEnd', width: 14 },
  { header: 'Expected Deliverable', key: 'deliverable', width: 32 },
  { header: 'Responsible Person', key: 'responsible', width: 20 },
  { header: 'Activity Status', key: 'status', width: 14 },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function PlanExportButton({ activities }) {
  const planRef = useRef(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      await exportReport({
        element: planRef.current,
        filename: `project-management-plan-${todayISO()}.pdf`,
      })
      message.success('PDF file downloaded')
    } catch (error) {
      console.error(error)
      message.error('Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportExcel = async () => {
    const rows = activities.map((activity) => ({
      activity: activity.name,
      plannedStart: formatDate(activity.planned_start_date),
      plannedEnd: formatDate(activity.planned_end_date),
      actualStart: formatDate(activity.actual_start_date),
      actualEnd: formatDate(activity.actual_end_date),
      deliverable: activity.expected_deliverable,
      responsible: activityResponsibleName(activity),
      status: STATUS[deriveStatus(activity)].label,
    }))
    await exportExcel({
      sheets: [{ name: 'Implementation Plan', columns: EXCEL_COLUMNS, rows }],
      filename: `project-management-plan-${todayISO()}.xlsx`,
    })
    message.success('Excel file downloaded')
  }

  const handleMenuClick = ({ key }) => {
    if (key === 'pdf') handleExportPdf()
    if (key === 'excel') handleExportExcel()
  }

  return (
    <>
      <Dropdown
        menu={{
          items: [
            { key: 'pdf', label: 'Export as PDF', icon: <FilePdfOutlined /> },
            { key: 'excel', label: 'Export as Excel', icon: <FileExcelOutlined /> },
          ],
          onClick: handleMenuClick,
        }}
      >
        <Button
          loading={exportingPdf}
          style={{
            background: '#ffffff',
            border: '1px solid #D9DDE3',
            color: '#191919',
            height: 42,
            borderRadius: 8,
          }}
        >
          Export Project Management Plan <DownOutlined />
        </Button>
      </Dropdown>
      <ImplementationPlanView ref={planRef} activities={activities} />
    </>
  )
}

export default PlanExportButton
