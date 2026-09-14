import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from 'antd'
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import api from '../lib/axios'
import { fetchProjectsCached } from '../lib/projectsCache'
import { unwrapList } from '../lib/apiHelpers'
import { STATUS, deriveStatus } from '../lib/status'
import { activityResponsibleName } from '../lib/activityPerson'
import { formatDate } from '../lib/dates'
import { exportExcel, exportReport } from '../lib/reportExport'
import { PROJECT_CATEGORIES } from '../lib/projectCatalog'
import PortfolioReportView from '../components/reports/PortfolioReportView'

const { Text } = Typography

const PRIMARY = '#962c30'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'not_started', label: 'Not started' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
]

const WORKFLOW_STATUS_LABEL = {
  'Plan Submitted': 'Pending Review',
}

/**
 * Progress bucket for report filters — aligned with Project Management
 * (Closed / closed_at = completed), not activity date-derivation alone.
 */
function projectProgressBucket(project) {
  if (project?.closed_at || project?.status === 'Closed') return 'completed'

  const stage = String(project?.lifecycle_stage || '').toLowerCase()
  const workflowStatus = String(project?.status || '')

  if (
    stage === 'execution' ||
    stage === 'closure' ||
    workflowStatus === 'In Execution' ||
    workflowStatus === 'Plan Approved' ||
    project?.actual_start_date ||
    project?.execution_started_at
  ) {
    return 'ongoing'
  }

  return 'not_started'
}

function projectWorkflowLabel(project) {
  const raw = project?.status || ''
  return WORKFLOW_STATUS_LABEL[raw] || raw || '—'
}

function norm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function filtersLabel({ status, category, selectedCount, totalCount }) {
  const parts = []
  if (status !== 'all') parts.push(STATUS_OPTIONS.find((item) => item.value === status)?.label)
  if (category !== 'all') parts.push(category)
  if (selectedCount < totalCount) parts.push(`${selectedCount} of ${totalCount} projects selected`)
  return parts.length ? parts.join(' · ') : 'All available projects'
}

export default function GenerateReportPage() {
  const reportRef = useRef(null)
  const [projects, setProjects] = useState([])
  const [detailsById, setDetailsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [exporting, setExporting] = useState(null)
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [includeActivities, setIncludeActivities] = useState(true)
  const [includeRequirements, setIncludeRequirements] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [pdfPreviewName, setPdfPreviewName] = useState('')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchProjectsCached()
      const list = unwrapList(response.data)
      setProjects(list)
      setSelectedIds([])
    } catch {
      message.error('Could not load projects for the report.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (status !== 'all' && projectProgressBucket(project) !== status) return false
      if (category !== 'all' && norm(project.category) !== norm(category)) return false
      return true
    })
  }, [projects, status, category])

  const categoryOptions = useMemo(() => {
    const fromData = projects.map((project) => project.category).filter(Boolean)
    return [...new Set([...PROJECT_CATEGORIES, ...fromData])]
  }, [projects])

  useEffect(() => {
    const allowed = new Set(filteredProjects.map((project) => project.id))
    setSelectedIds((prev) => {
      const next = prev.filter((id) => allowed.has(id))
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev
      }
      return next
    })
  }, [filteredProjects])

  const selectedProjects = useMemo(
    () => filteredProjects.filter((project) => selectedIds.includes(project.id)),
    [filteredProjects, selectedIds],
  )

  const needsRequirements = includeRequirements

  useEffect(() => {
    let cancelled = false

    async function loadDetails() {
      if (!selectedProjects.length) {
        setDetailsById({})
        setLoadingDetails(false)
        return
      }

      setLoadingDetails(true)
      try {
        const entries = await Promise.all(
          selectedProjects.map(async (project) => {
            const requests = [api.get(`/projects/${project.id}/activities`, { params: { lite: 1 } })]
            if (needsRequirements) {
              requests.push(api.get(`/projects/${project.id}/requirements`, { params: { lite: 1 } }))
            }

            const responses = await Promise.all(requests)
            const activities = unwrapList(responses[0].data)
            const requirements = needsRequirements ? unwrapList(responses[1].data) : []

            return [project.id, { activities, documents: [], requirements }]
          }),
        )

        if (cancelled) return
        setDetailsById(Object.fromEntries(entries))
      } catch {
        if (!cancelled) message.error('Could not load project details for the report.')
      } finally {
        if (!cancelled) setLoadingDetails(false)
      }
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [selectedProjects, needsRequirements])

  const reportProjects = useMemo(
    () =>
      selectedProjects.map((project) => ({
        ...project,
        activities: detailsById[project.id]?.activities || [],
        documents: [],
        requirements: detailsById[project.id]?.requirements || [],
      })),
    [selectedProjects, detailsById],
  )

  const scopeLabel = filtersLabel({
    status,
    category,
    selectedCount: reportProjects.length,
    totalCount: filteredProjects.length,
  })

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
    }
  }, [pdfPreviewUrl])

  const waitForReportNode = async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    if (!reportRef.current) throw new Error('Report preview is not ready yet.')
    return reportRef.current
  }

  const handleExportPdf = async () => {
    if (!reportProjects.length) {
      message.warning('Select at least one project before generating a report.')
      return
    }
    if (loadingDetails) {
      message.info('Still loading project details — the PDF will start when ready.')
      return
    }
    setExporting('pdf')
    try {
      const element = await waitForReportNode()
      const filename = `pmms-portfolio-report-${todayISO()}.pdf`
      const { blob } = await exportReport({ element, filename, openInNewTab: false })
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setPdfPreviewName(filename)
      message.success('PDF generated successfully. Preview it below, then download if needed.')
    } catch (error) {
      console.error(error)
      message.error('Failed to generate the PDF report.')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    if (!reportProjects.length) {
      message.warning('Select at least one project before generating a report.')
      return
    }
    if (loadingDetails) {
      message.info('Still loading project details — try again in a moment.')
      return
    }
    setExporting('excel')
    try {
      const sheets = [
        {
          name: 'Portfolio',
          columns: [
            { header: 'SN', key: 'sn', width: 8 },
            { header: 'Project', key: 'name', width: 34 },
            { header: 'APR', key: 'apr', width: 18 },
            { header: 'Category', key: 'category', width: 16 },
            { header: 'Track', key: 'track', width: 10 },
            { header: 'Stage', key: 'stage', width: 14 },
            { header: 'Planner', key: 'planner', width: 22 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Activities', key: 'activities', width: 12 },
            { header: 'Budget (TZS)', key: 'budget', width: 16 },
          ],
          rows: reportProjects.map((project, index) => ({
            sn: index + 1,
            name: project.name,
            apr: project.annual_plan_reference || '',
            category: project.category || '',
            track: project.review_track || project.workflow?.review_track || '',
            stage: project.lifecycle_stage || project.phase || '',
            planner: project.planner?.name || '',
            status: projectWorkflowLabel(project),
            activities: project.activities.length,
            budget: project.budget ?? '',
          })),
        },
      ]

      if (includeActivities) {
        sheets.push({
          name: 'Activities',
          columns: [
            { header: 'Project', key: 'project', width: 30 },
            { header: 'Activity', key: 'activity', width: 28 },
            { header: 'Planned Start', key: 'plannedStart', width: 14 },
            { header: 'Planned End', key: 'plannedEnd', width: 14 },
            { header: 'Actual Start', key: 'actualStart', width: 14 },
            { header: 'Actual End', key: 'actualEnd', width: 14 },
            { header: 'Deliverable', key: 'deliverable', width: 28 },
            { header: 'Responsible', key: 'responsible', width: 20 },
            { header: 'Status', key: 'status', width: 14 },
          ],
          rows: reportProjects.flatMap((project) =>
            project.activities.map((activity) => ({
              project: project.name,
              activity: activity.name,
              plannedStart: formatDate(activity.planned_start_date),
              plannedEnd: formatDate(activity.planned_end_date),
              actualStart: formatDate(activity.actual_start_date),
              actualEnd: formatDate(activity.actual_end_date),
              deliverable: activity.expected_deliverable || '',
              responsible: activityResponsibleName(activity),
              status: STATUS[deriveStatus(activity)].label,
            })),
          ),
        })
      }

      if (includeRequirements) {
        sheets.push({
          name: 'Traceability',
          columns: [
            { header: 'Project', key: 'project', width: 30 },
            { header: 'Code', key: 'code', width: 14 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Test result', key: 'test', width: 12 },
          ],
          rows: reportProjects.flatMap((project) =>
            project.requirements.map((requirement) => ({
              project: project.name,
              code: requirement.requirement_code,
              description: requirement.description,
              status: requirement.implementation_status || '',
              test: requirement.test_result || 'not_tested',
            })),
          ),
        })
      }

      const filename = `pmms-portfolio-report-${todayISO()}.xlsx`
      await exportExcel({ sheets, filename, openInNewTab: true })
      message.success('Excel report generated and downloaded.')
    } catch (error) {
      console.error(error)
      message.error('Failed to generate the Excel report.')
    } finally {
      setExporting(null)
    }
  }

  const columns = [
    { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
    {
      title: 'Project',
      dataIndex: 'name',
    },
    {
      title: 'Track',
      render: (_, record) => record.review_track || record.workflow?.review_track || '—',
    },
    {
      title: 'Stage',
      render: (_, record) => record.lifecycle_stage || record.phase || '—',
    },
    {
      title: 'Planner',
      render: (_, record) => record.planner?.name || '—',
    },
    {
      title: 'Activities',
      align: 'center',
      render: (_, record) =>
        selectedIds.includes(record.id)
          ? (detailsById[record.id]?.activities?.length ?? (loadingDetails ? '…' : 0))
          : '—',
    },
  ]

  const pdfBusy = loadingDetails || exporting === 'pdf'
  const pdfLabel = loadingDetails
    ? 'Loading related details…'
    : exporting === 'pdf'
      ? 'Generating PDF…'
      : 'Generate PDF'

  return (
    <div className="page-container flex flex-col gap-3">
      <Card className="page-shell-card" styles={{ body: { padding: 16 } }}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
              Project status
            </Text>
            <Select className="w-full" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
          <div>
            <Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
              Category
            </Text>
            <Select
              className="w-full"
              value={category}
              onChange={setCategory}
              options={[
                { value: 'all', label: 'All categories' },
                ...categoryOptions.map((item) => ({ value: item, label: item })),
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox checked={includeActivities} onChange={(event) => setIncludeActivities(event.target.checked)}>
            Implementation activities
          </Checkbox>
          <Checkbox
            checked={includeRequirements}
            onChange={(event) => setIncludeRequirements(event.target.checked)}
          >
            Traceability matrix
          </Checkbox>
        </div>
      </Card>

      <Card className="page-shell-card" styles={{ body: { padding: 16 } }}>
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Spin />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Empty description="No projects match the current filters." />
        ) : (
          <Table
            className="pms-house-table"
            rowKey="id"
            size="middle"
            dataSource={filteredProjects}
            columns={columns}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys),
            }}
          />
        )}
      </Card>

      <Card className="page-shell-card" styles={{ body: { padding: 16 } }}>
        <Space wrap>
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            loading={pdfBusy}
            disabled={loading || !reportProjects.length || loadingDetails}
            onClick={handleExportPdf}
            style={{ background: PRIMARY }}
          >
            {pdfLabel}
          </Button>
          <Button
            size="large"
            icon={<FileExcelOutlined />}
            loading={exporting === 'excel'}
            disabled={loading || loadingDetails || !reportProjects.length}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
        </Space>
      </Card>

      <Modal
        open={Boolean(pdfPreviewUrl)}
        title={pdfPreviewName || 'PDF preview'}
        onCancel={() => {
          if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
          setPdfPreviewUrl(null)
        }}
        width="90vw"
        style={{ top: 24 }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
              setPdfPreviewUrl(null)
            }}
          >
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            style={{ background: PRIMARY }}
            onClick={() => {
              if (!pdfPreviewUrl) return
              const link = document.createElement('a')
              link.href = pdfPreviewUrl
              link.download = pdfPreviewName || 'pmms-portfolio-report.pdf'
              link.click()
            }}
          >
            Download PDF
          </Button>,
        ]}
      >
        {pdfPreviewUrl ? (
          <iframe
            title="Generated PDF preview"
            src={pdfPreviewUrl}
            style={{ width: '100%', height: '75vh', border: `1px solid ${PRIMARY}`, borderRadius: 8 }}
          />
        ) : null}
      </Modal>

      {/* Off-screen printable template — keep opacity:1 so html2canvas can measure tables */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -12000,
          top: 0,
          width: 1100,
          pointerEvents: 'none',
          opacity: 1,
          overflow: 'visible',
        }}
      >
        <PortfolioReportView
          ref={reportRef}
          projects={reportProjects}
          includeActivities={includeActivities}
          includeDocuments={false}
          includeRequirements={includeRequirements}
          filtersLabel={scopeLabel}
        />
      </div>
    </div>
  )
}
