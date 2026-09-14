import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import { Search } from 'lucide-react'
import api from '../lib/axios'
import { fetchProjectsCached } from '../lib/projectsCache'
import { unwrapList } from '../lib/apiHelpers'
import { STATUS, deriveStatus } from '../lib/status'
import { activityResponsibleName } from '../lib/activityPerson'
import { formatDate } from '../lib/dates'
import { exportExcel, exportReport } from '../lib/reportExport'
import { PROJECT_CATEGORIES, REVIEW_TRACKS } from '../lib/projectCatalog'
import PortfolioReportView from '../components/reports/PortfolioReportView'

const { Title, Text } = Typography

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

function filtersLabel({ status, track, category, selectedCount, totalCount }) {
  const parts = []
  if (status !== 'all') parts.push(STATUS_OPTIONS.find((item) => item.value === status)?.label)
  if (track !== 'all') parts.push(track)
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
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [track, setTrack] = useState('all')
  const [category, setCategory] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [includeActivities, setIncludeActivities] = useState(true)
  const [includeDocuments, setIncludeDocuments] = useState(false)
  const [includeRequirements, setIncludeRequirements] = useState(false)
  const [previewProjectId, setPreviewProjectId] = useState(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [pdfPreviewName, setPdfPreviewName] = useState('')
  const [excelReady, setExcelReady] = useState(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchProjectsCached()
      const list = unwrapList(response.data)
      setProjects(list)
      setSelectedIds([])
      setPreviewProjectId(list[0]?.id ?? null)
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
    const term = search.trim().toLowerCase()
    return projects.filter((project) => {
      if (status !== 'all' && projectProgressBucket(project) !== status) return false
      const projectTrack = project.review_track || project.workflow?.review_track
      if (track !== 'all' && norm(projectTrack) !== norm(track)) return false
      if (category !== 'all' && norm(project.category) !== norm(category)) return false
      if (!term) return true
      return [project.name, project.category, project.planner?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [projects, search, status, track, category])

  const categoryOptions = useMemo(() => {
    const fromData = projects.map((project) => project.category).filter(Boolean)
    return [...new Set([...PROJECT_CATEGORIES, ...fromData])]
  }, [projects])

  const trackOptions = useMemo(() => {
    const fromData = projects
      .map((project) => project.review_track || project.workflow?.review_track)
      .filter(Boolean)
    const defaults = REVIEW_TRACKS.map((item) => item.value)
    return [...new Set([...defaults, ...fromData])]
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

  const needsDocuments = includeDocuments
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
            if (needsDocuments) requests.push(api.get(`/projects/${project.id}/documents`, { params: { lite: 1 } }))
            if (needsRequirements) requests.push(api.get(`/projects/${project.id}/requirements`, { params: { lite: 1 } }))

            const responses = await Promise.all(requests)
            let cursor = 1
            const activities = unwrapList(responses[0].data)
            const documents = needsDocuments ? unwrapList(responses[cursor++].data) : []
            const requirements = needsRequirements ? unwrapList(responses[cursor].data) : []

            return [project.id, { activities, documents, requirements }]
          }),
        )

        if (cancelled) return
        setDetailsById(Object.fromEntries(entries))
      } catch {
        if (!cancelled) message.error('Could not load project details for the preview.')
      } finally {
        if (!cancelled) setLoadingDetails(false)
      }
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [selectedProjects, needsDocuments, needsRequirements])

  const reportProjects = useMemo(
    () =>
      selectedProjects.map((project) => ({
        ...project,
        activities: detailsById[project.id]?.activities || [],
        documents: detailsById[project.id]?.documents || [],
        requirements: detailsById[project.id]?.requirements || [],
      })),
    [selectedProjects, detailsById],
  )

  const previewProject = reportProjects.find((project) => project.id === previewProjectId) || reportProjects[0]

  useEffect(() => {
    if (!previewProject) {
      setPreviewProjectId(null)
      return
    }
    if (!reportProjects.some((project) => project.id === previewProjectId)) {
      setPreviewProjectId(previewProject.id)
    }
  }, [reportProjects, previewProject, previewProjectId])

  const scopeLabel = filtersLabel({
    status,
    track,
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

      if (includeDocuments) {
        sheets.push({
          name: 'Documents',
          columns: [
            { header: 'Project', key: 'project', width: 30 },
            { header: 'File', key: 'file', width: 32 },
            { header: 'Type', key: 'type', width: 18 },
            { header: 'Version', key: 'version', width: 10 },
            { header: 'Review status', key: 'review', width: 16 },
          ],
          rows: reportProjects.flatMap((project) =>
            project.documents.map((document) => ({
              project: project.name,
              file: document.file_name || document.name || '',
              type: document.document_type || '',
              version: document.version_number ?? '',
              review: document.review_status || '',
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
      const { blob } = await exportExcel({ sheets, filename, download: false })
      setExcelReady({
        blob,
        filename,
        sheetNames: sheets.map((sheet) => sheet.name),
        rowCount: sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
      })
      message.success('Excel report generated successfully. Download it below.')
    } catch (error) {
      console.error(error)
      message.error('Failed to generate the Excel report.')
    } finally {
      setExporting(null)
    }
  }

  const downloadExcelReady = () => {
    if (!excelReady) return
    const url = URL.createObjectURL(excelReady.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = excelReady.filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
    {
      title: 'Project',
      dataIndex: 'name',
      render: (name, record) => (
        <Button type="link" style={{ padding: 0, color: PRIMARY }} onClick={() => setPreviewProjectId(record.id)}>
          {name}
        </Button>
      ),
    },
    {
      title: 'Track',
      key: 'track',
      render: (_, record) => record.review_track || record.workflow?.review_track || '—',
    },
    {
      title: 'Stage',
      key: 'stage',
      render: (_, record) => record.lifecycle_stage || record.phase || '—',
    },
    {
      title: 'Planner',
      key: 'planner',
      render: (_, record) => record.planner?.name || '—',
    },
    {
      title: 'Activities',
      key: 'activities',
      align: 'center',
      render: (_, record) => detailsById[record.id]?.activities?.length ?? '…',
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
        <Input
          allowClear
          prefix={<Search className="h-4 w-4 text-gray-400" />}
          placeholder="Search project, category, or planner"
          className="mb-3"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
              Project status
            </Text>
            <Select className="w-full" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
          <div>
            <Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
              Review track
            </Text>
            <Select
              className="w-full"
              value={track}
              onChange={setTrack}
              options={[{ value: 'all', label: 'All tracks' }, ...trackOptions.map((value) => ({ value, label: value }))]}
            />
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
          <Checkbox checked disabled>
            Project summary
          </Checkbox>
          <Checkbox checked={includeActivities} onChange={(event) => setIncludeActivities(event.target.checked)}>
            Implementation activities
          </Checkbox>
          <Checkbox checked={includeDocuments} onChange={(event) => setIncludeDocuments(event.target.checked)}>
            Documents
          </Checkbox>
          <Checkbox
            checked={includeRequirements}
            onChange={(event) => setIncludeRequirements(event.target.checked)}
          >
            Traceability matrix
          </Checkbox>
        </div>
      </Card>

      <Card
        className="page-shell-card"
        extra={
          loadingDetails ? (
            <Space>
              <Spin size="small" />
              <Text type="secondary">Loading related details…</Text>
            </Space>
          ) : (
            <Text type="secondary">{reportProjects.length} projects selected</Text>
          )
        }
        styles={{ body: { padding: 16 } }}
      >
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
            onRow={(record) => ({
              onClick: () => setPreviewProjectId(record.id),
              style: {
                cursor: 'pointer',
                background: record.id === previewProject?.id ? 'rgba(150, 44, 48, 0.04)' : undefined,
              },
            })}
          />
        )}

        {previewProject ? (
          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Title level={5} className="!mb-0" style={{ color: PRIMARY }}>
                  {previewProject.name}
                </Title>
                <Text type="secondary">
                  {previewProject.review_track || previewProject.workflow?.review_track || '—'} ·{' '}
                  {previewProject.lifecycle_stage || previewProject.phase || '—'} ·{' '}
                  {projectWorkflowLabel(previewProject)}
                </Text>
              </div>
              <Tag color="gold">{previewProject.activities.length} activities</Tag>
            </div>

            <Collapse
              defaultActiveKey={['activities']}
              items={[
                includeActivities
                  ? {
                      key: 'activities',
                      label: 'Implementation activities',
                      children: (
                        <Table
                          size="small"
                          pagination={false}
                          rowKey={(row) => row.id}
                          dataSource={previewProject.activities}
                          locale={{ emptyText: 'No activities recorded for this project.' }}
                          columns={[
                            { title: 'SN', width: 48, render: (_, __, index) => index + 1 },
                            { title: 'Activity', dataIndex: 'name' },
                            {
                              title: 'Planned',
                              render: (_, row) =>
                                `${formatDate(row.planned_start_date)} → ${formatDate(row.planned_end_date)}`,
                            },
                            {
                              title: 'Actual',
                              render: (_, row) =>
                                `${formatDate(row.actual_start_date)} → ${formatDate(row.actual_end_date)}`,
                            },
                            { title: 'Deliverable', dataIndex: 'expected_deliverable', render: (value) => value || '—' },
                            {
                              title: 'Responsible',
                              render: (_, row) => activityResponsibleName(row),
                            },
                            {
                              title: 'Status',
                              render: (_, row) => STATUS[deriveStatus(row)].label,
                            },
                          ]}
                        />
                      ),
                    }
                  : null,
                includeDocuments
                  ? {
                      key: 'documents',
                      label: 'Documents',
                      children: (
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="id"
                          dataSource={previewProject.documents}
                          locale={{ emptyText: 'No documents uploaded.' }}
                          columns={[
                            { title: 'File', dataIndex: 'file_name', render: (value, row) => value || row.name || '—' },
                            { title: 'Type', dataIndex: 'document_type' },
                            {
                              title: 'Version',
                              dataIndex: 'version_number',
                              render: (value) => (value != null ? `v${value}` : '—'),
                            },
                            { title: 'Review', dataIndex: 'review_status' },
                          ]}
                        />
                      ),
                    }
                  : null,
                includeRequirements
                  ? {
                      key: 'requirements',
                      label: 'Traceability matrix',
                      children: (
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="id"
                          dataSource={previewProject.requirements}
                          locale={{ emptyText: 'No requirements recorded.' }}
                          columns={[
                            { title: 'Code', dataIndex: 'requirement_code' },
                            { title: 'Description', dataIndex: 'description' },
                            { title: 'Status', dataIndex: 'implementation_status' },
                            {
                              title: 'Test result',
                              dataIndex: 'test_result',
                              render: (value) => value || 'not_tested',
                            },
                          ]}
                        />
                      ),
                    }
                  : null,
              ].filter(Boolean)}
            />
          </div>
        ) : null}
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

      <Modal
        open={Boolean(excelReady)}
        title={excelReady?.filename || 'Excel report'}
        onCancel={() => setExcelReady(null)}
        footer={[
          <Button key="close" onClick={() => setExcelReady(null)}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            style={{ background: PRIMARY }}
            onClick={downloadExcelReady}
          >
            Download Excel
          </Button>,
        ]}
      >
        {excelReady && (
          <div className="flex flex-col gap-2">
            <Text>Your Excel report is ready — {excelReady.rowCount} rows across {excelReady.sheetNames.length} sheet{excelReady.sheetNames.length === 1 ? '' : 's'}.</Text>
            <div className="flex flex-wrap gap-2">
              {excelReady.sheetNames.map((name) => (
                <Tag key={name} color="green">
                  {name}
                </Tag>
              ))}
            </div>
          </div>
        )}
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
          includeDocuments={includeDocuments}
          includeRequirements={includeRequirements}
          filtersLabel={scopeLabel}
        />
      </div>
    </div>
  )
}
