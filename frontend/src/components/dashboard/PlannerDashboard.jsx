import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, message } from 'antd'
import { FolderKanban, RotateCcw, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem, unwrapList } from '../../lib/apiHelpers'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../utility/Config.jsx'
import DataTable from '../common/DataTable'
import { DASHBOARD_CARD_THEMES } from './chartConstants'

// Tinted metric card: icon, figure, and label all share the theme's accent
// colour so they read as one unit — never a coloured icon beside a
// muted-grey label. Body text/captions stay DASHBOARD_CARD_BODY_TEXT.
function TintedMetricCard({ icon: Icon, label, value, theme, linkLabel, onLinkClick }) {
  return (
    <div
      style={{
        background: theme.background,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 20,
        height: '100%',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={20} color={theme.accent} />
        <span style={{ color: theme.accent, fontWeight: 700, fontSize: 13 }}>{label}</span>
      </div>
      <div className="mt-2" style={{ color: theme.accent, fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </div>
      {linkLabel && (
        <>
          <div className="mt-3" style={{ borderTop: `1px solid ${theme.divider}` }} />
          <button
            type="button"
            className="mt-3 text-sm font-semibold"
            style={{ color: theme.link }}
            onClick={onLinkClick}
          >
            {linkLabel}
          </button>
        </>
      )}
    </div>
  )
}

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
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <TintedMetricCard
            icon={FolderKanban}
            label="Assigned projects"
            value={counts.assigned_projects ?? projects.length}
            theme={DASHBOARD_CARD_THEMES.amber}
            linkLabel="View all projects"
            onLinkClick={() => navigate('/projects')}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <TintedMetricCard
            icon={RotateCcw}
            label="Plans returned"
            value={counts.plans_returned ?? returned.length}
            theme={DASHBOARD_CARD_THEMES.green}
            linkLabel="View returned plans"
            onLinkClick={() => document.getElementById('returned-for-revision')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <TintedMetricCard
            icon={Clock}
            label="Overdue activities"
            value={counts.overdue_activities ?? 0}
            theme={DASHBOARD_CARD_THEMES.amber}
            linkLabel="View in projects"
            onLinkClick={() => navigate('/projects')}
          />
        </Col>
      </Row>

      <Card id="returned-for-revision" className="page-shell-card mt-4" title="Returned for revision" styles={{ body: { padding: 0 } }}>
        <DataTable
          rowKey="id"
          data={returned}
          searchPlaceholder="Search returned projects..."
          emptyText="No returned plans or closure requests."
          columns={[
            { title: 'Project', dataIndex: 'name', width: 220 },
            {
              title: 'Reason',
              render: (_, record) =>
                record.plan_review_comment || record.workflow?.closure_return_comment || 'Returned',
              searchValue: (record) =>
                record.plan_review_comment || record.workflow?.closure_return_comment || 'Returned',
            },
            {
              title: 'Open',
              width: 100,
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

      <Card className="page-shell-card mt-4" title="Notifications" styles={{ body: { padding: 0 } }}>
        <DataTable
          rowKey="id"
          data={notifications.slice(0, 8)}
          searchPlaceholder="Search notifications..."
          emptyText="No notifications."
          columns={[
            { title: 'Type', dataIndex: 'type', width: 160 },
            { title: 'Message', dataIndex: 'message' },
            {
              title: 'When',
              dataIndex: 'created_at',
              width: 140,
              render: (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—'),
            },
          ]}
        />
      </Card>
    </div>
  )
}
