import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Select, Space, Table, Tag, message } from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import api from '../lib/axios'
import { fetchProjectsCached } from '../lib/projectsCache'
import { unwrapList } from '../lib/apiHelpers'
import { exportExcel } from '../lib/reportExport'
import { QUEUE_LABELS } from '../lib/queueLabels'

function formatMoney(value) {
  if (!value && value !== 0) return '—'
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function ReportsPage() {
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState('')
  const [reportProjectId, setReportProjectId] = useState(null)
  const [downloadingReport, setDownloadingReport] = useState(false)

  useEffect(() => {
    fetchProjectsCached().then((response) => {
      const list = unwrapList(response.data)
      setProjects(list)
      setReportProjectId((current) => current ?? list[0]?.id ?? null)
    })
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((project) => {
      const track = project.review_track || project.workflow?.review_track
      return [project.name, project.category, project.status, track, project.planner?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [projects, search])

  const rows = useMemo(
    () =>
      filtered.map((project) => ({
        id: project.id,
        name: project.name,
        category: project.category,
        status: project.status,
        track: project.review_track || project.workflow?.review_track,
        planner: project.planner?.name,
        budget: project.budget,
        queue: project.workflow?.queue,
      })),
    [filtered],
  )

  const exportPortfolio = () => {
    exportExcel({
      filename: 'pmms-portfolio.xlsx',
      sheets: [
        {
          name: 'Projects',
          columns: [
            { header: 'Project Name', key: 'name', width: 32 },
            { header: 'Category', key: 'category', width: 16 },
            { header: 'Status', key: 'status', width: 18 },
            { header: 'Track', key: 'track', width: 12 },
            { header: 'Planner', key: 'planner', width: 22 },
            { header: 'Budget', key: 'budget', width: 16 },
            { header: 'Queue', key: 'queue', width: 20 },
          ],
          rows: rows.map((row) => ({ ...row, queue: QUEUE_LABELS[row.queue] || row.queue })),
        },
      ],
    }).then(() => message.success(`Exported ${rows.length} project(s)`))
  }

  const downloadProjectReport = async () => {
    if (!reportProjectId) return
    setDownloadingReport(true)
    try {
      const response = await api.get(`/projects/${reportProjectId}/report`, { responseType: 'blob' })
      const project = projects.find((item) => item.id === reportProjectId)
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${project?.name || 'project'}-report.docx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Could not download the project report.')
    } finally {
      setDownloadingReport(false)
    }
  }

  return (
    <div>
      <Space wrap className="mb-2" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search project, category, planner, status"
            className="w-72"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="primary" icon={<DownloadOutlined />} onClick={exportPortfolio}>
            Export portfolio (Excel)
          </Button>
        </Space>
        <Space wrap>
          <Select
            className="w-64"
            value={reportProjectId}
            onChange={setReportProjectId}
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
            placeholder="Choose a project"
          />
          <Button icon={<DownloadOutlined />} loading={downloadingReport} onClick={downloadProjectReport}>
            Download project report (Word)
          </Button>
        </Space>
      </Space>

      <Card className="page-shell-card" style={{ marginTop: 0 }} styles={{ body: { padding: 10 } }}>
        <Table
          className="pms-house-table"
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
            { title: 'Project Name', dataIndex: 'name' },
            { title: 'Category', dataIndex: 'category' },
            { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
            { title: 'Track', dataIndex: 'track' },
            { title: 'Planner', dataIndex: 'planner' },
            { title: 'Budget', dataIndex: 'budget', render: (value) => formatMoney(value) },
            { title: 'Queue', dataIndex: 'queue', render: (value) => <Tag>{QUEUE_LABELS[value] || value}</Tag> },
          ]}
        />
      </Card>
    </div>
  )
}
