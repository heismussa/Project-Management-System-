import { useRef, useState } from 'react'
import { Dropdown, Button, message } from 'antd'
import { DownOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons'
import { exportReport, exportExcel } from '../../lib/reportExport'
import { STATUS, deriveStatus } from '../../lib/status'
import { getPersonName, getPersonRole } from '../../data/people'
import ImplementationPlanView from './ImplementationPlanView'

const EXCEL_COLUMNS = [
  { header: 'Phase', key: 'phase', width: 32 },
  { header: 'Activity', key: 'activity', width: 32 },
  { header: 'Expected Deliverable', key: 'deliverable', width: 32 },
  { header: 'Planned Start', key: 'plannedStart', width: 14 },
  { header: 'Planned End', key: 'plannedEnd', width: 14 },
  { header: 'Actual Start', key: 'actualStart', width: 14 },
  { header: 'Actual End', key: 'actualEnd', width: 14 },
  { header: 'Responsible Person', key: 'responsible', width: 20 },
  { header: 'Assigned Role', key: 'role', width: 20 },
  { header: 'Status', key: 'status', width: 14 },
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
      phase: activity.phase ?? '',
      activity: activity.name,
      deliverable: activity.expected_deliverable,
      plannedStart: activity.planned_start_date ?? '',
      plannedEnd: activity.planned_end_date ?? '',
      actualStart: activity.actual_start_date ?? '',
      actualEnd: activity.actual_end_date ?? '',
      responsible: getPersonName(activity.responsible_person_id),
      role: getPersonRole(activity.responsible_person_id),
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
