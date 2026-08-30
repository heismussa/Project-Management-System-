import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Select, Space, Table, Tag, Typography, message } from 'antd'
import api from '../lib/axios'
import { unwrapList } from '../lib/apiHelpers'
import { exportExcel } from '../lib/reportExport'
import PlanExportButton from '../components/activities/PlanExportButton'

const { Title, Paragraph } = Typography

export default function ReportsPage() {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(null)
  const [activities, setActivities] = useState([])

  useEffect(() => {
    api.get('/projects').then((response) => {
      const list = unwrapList(response.data)
      setProjects(list)
      setProjectId(list[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!projectId) {
      setActivities([])
      return
    }
    api
      .get(`/projects/${projectId}/activities`)
      .then((response) => setActivities(unwrapList(response.data)))
      .catch(() => setActivities([]))
  }, [projectId])

  const rows = useMemo(
    () =>
      projects.map((project) => ({
        name: project.name,
        apr: project.annual_plan_reference,
        status: project.status,
        track: project.review_track || project.workflow?.review_track,
        planner: project.planner?.name,
        queue: project.workflow?.queue,
      })),
    [projects],
  )

  const exportPortfolio = () => {
    exportExcel({
      filename: 'pmms-portfolio.xlsx',
      sheets: [
        {
          name: 'Projects',
          columns: [
            { header: 'Project', key: 'name', width: 32 },
            { header: 'APR', key: 'apr', width: 20 },
            { header: 'Status', key: 'status', width: 18 },
            { header: 'Track', key: 'track', width: 12 },
            { header: 'Planner', key: 'planner', width: 22 },
            { header: 'Queue', key: 'queue', width: 20 },
          ],
          rows,
        },
      ],
    }).then(() => message.success('Portfolio exported'))
  }

  return (
    <div>
      <Title level={4} className="!mb-1">
        Reports
      </Title>
      <Paragraph type="secondary">Export the portfolio or the selected implementation plan.</Paragraph>

      <Space wrap className="mb-4">
        <Button type="primary" onClick={exportPortfolio}>
          Export portfolio (Excel)
        </Button>
        <Select
          className="min-w-[260px]"
          value={projectId}
          onChange={setProjectId}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
        <PlanExportButton activities={activities} />
      </Space>

      <Card className="page-shell-card">
        <Table
          className="pms-house-table"
          rowKey="name"
          dataSource={rows}
          columns={[
            { title: 'Project', dataIndex: 'name' },
            { title: 'APR', dataIndex: 'apr' },
            { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
            { title: 'Track', dataIndex: 'track' },
            { title: 'Planner', dataIndex: 'planner' },
            { title: 'Queue', dataIndex: 'queue' },
          ]}
        />
      </Card>
    </div>
  )
}
