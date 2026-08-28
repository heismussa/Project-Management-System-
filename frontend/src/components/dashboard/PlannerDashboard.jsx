import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, Statistic, Table, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem, unwrapList } from '../../lib/apiHelpers'
import { deriveStatus } from '../../lib/status'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../utility/Config.jsx'

const { Title, Paragraph } = Typography

export default function PlannerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [payload, setPayload] = useState(null)
  const [projects, setProjects] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    api.get('/dashboard', { params: { role: ROLES.PPL } }).then((response) => {
      setPayload(unwrapItem(response.data))
    })
    api
      .get('/projects', { params: { planner_id: user?.id, role: ROLES.PPL } })
      .then((response) => setProjects(unwrapList(response.data)))
      .catch(() => message.error('Could not load assigned projects.'))

    const timer = window.setTimeout(() => {
      api
        .get('/notifications')
        .then((response) => setNotifications(unwrapList(response.data)))
        .catch(() => setNotifications([]))
    }, 600)
    return () => window.clearTimeout(timer)
  }, [user?.id])

  const returned = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.plan_review_status === 'changes_requested' || project.workflow?.closure_return_comment,
      ),
    [projects],
  )

  const open = (project, tab) => {
    storeProjectId(project.id)
    navigate(`/projects/${project.id}?tab=${tab}`)
  }

  const counts = payload?.counts || {}

  return (
    <div>
      <Title level={4} className="!mb-1">
        Planner dashboard
      </Title>
      <Paragraph type="secondary">Assigned work, returned plans, deadlines, and notifications.</Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="page-shell-card">
            <Statistic title="Assigned projects" value={counts.assigned_projects ?? projects.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="page-shell-card">
            <Statistic title="Plans returned" value={counts.plans_returned ?? returned.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="page-shell-card">
            <Statistic title="Overdue activities" value={counts.overdue_activities ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="page-shell-card">
            <Statistic title="Matrix items pending" value={counts.pending_matrix_items ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card className="page-shell-card mt-4" title="Assigned projects">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={projects}
          columns={[
            { title: 'Project', dataIndex: 'name' },
            { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
            {
              title: 'Progress',
              render: (_, record) => deriveStatus(record).replaceAll('_', ' '),
            },
            {
              title: 'Open',
              render: (_, record) => (
                <button type="button" className="text-[#650018] underline" onClick={() => open(record, 'plan')}>
                  Workspace
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Card className="page-shell-card mt-4" title="Returned for revision">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={returned}
          locale={{ emptyText: 'No returned plans or closure requests.' }}
          columns={[
            { title: 'Project', dataIndex: 'name' },
            {
              title: 'Reason',
              render: (_, record) =>
                record.plan_review_comment || record.workflow?.closure_return_comment || 'Returned',
            },
            {
              title: 'Open',
              render: (_, record) => (
                <button
                  type="button"
                  className="text-[#650018] underline"
                  onClick={() => open(record, record.workflow?.closure_return_comment ? 'closure' : 'plan')}
                >
                  Fix
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Card className="page-shell-card mt-4" title="Notifications">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={notifications.slice(0, 8)}
          locale={{ emptyText: 'No notifications.' }}
          columns={[
            { title: 'Type', dataIndex: 'type' },
            { title: 'Message', dataIndex: 'message' },
            {
              title: 'When',
              dataIndex: 'created_at',
              render: (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—'),
            },
          ]}
        />
      </Card>
    </div>
  )
}
