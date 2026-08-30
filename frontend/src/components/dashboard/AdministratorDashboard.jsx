import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Progress, Table, Typography, message } from 'antd'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem } from '../../lib/apiHelpers'
import PhaseBarChart from './PhaseBarChart'
import { BRAND_MAROON, DASHBOARD_CARD_STYLE } from './chartConstants'

const { Title, Text } = Typography

const STATUS_COLORS = { ongoing: '#ffc20a', completed: '#068737', not_started: '#98A2B3' }
const STATUS_LABELS = { ongoing: 'Ongoing', completed: 'Completed', not_started: 'Not Started' }

function projectsUrl(params) {
  return `/projects?${new URLSearchParams(params).toString()}`
}

function ClickableStat({ label, value, onClick, accent }) {
  return (
    <Card
      hoverable
      className="page-shell-card" style={DASHBOARD_CARD_STYLE}
      onClick={onClick}
      styles={{ body: { padding: 20 } }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick()
      }}
    >
      <Text type="secondary">{label}</Text>
      <div className="mt-1 text-3xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </Card>
  )
}

function AdministratorDashboard() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/dashboard', { params: { role: 'Project Administrator' } })
      .then((response) => {
        if (cancelled) return
        setAdmin(unwrapItem(response.data)?.admin ?? null)
      })
      .catch(() => {
        if (!cancelled) message.error('Could not load the administrator dashboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goToProjectReview = (projectId) => {
    storeProjectId(projectId)
    navigate(`/reviews?projectId=${projectId}`)
  }

  if (loading || !admin) {
    return (
      <Card className="page-shell-card" loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { status_counts: statusCounts, phase_counts: phaseCounts } = admin

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — four equal metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStat label="Total projects" value={statusCounts.total} onClick={() => navigate('/projects')} />
        <ClickableStat
          label="Ongoing"
          value={statusCounts.ongoing}
          accent={STATUS_COLORS.ongoing}
          onClick={() => navigate(projectsUrl({ derivedStatus: 'ongoing' }))}
        />
        <ClickableStat
          label="Completed"
          value={statusCounts.completed}
          accent={STATUS_COLORS.completed}
          onClick={() => navigate(projectsUrl({ derivedStatus: 'completed' }))}
        />
        <ClickableStat
          label="Not started"
          value={statusCounts.not_started}
          accent={STATUS_COLORS.not_started}
          onClick={() => navigate(projectsUrl({ derivedStatus: 'not_started' }))}
        />
      </div>

      {/* Row 2 — implementation score panel, one horizontal row */}
      <Card className="page-shell-card" title="Implementation score">
        <div className="relative grid grid-cols-2 items-center gap-y-6 sm:grid-cols-4">
          <div className="flex flex-col items-center justify-center text-center">
            <Progress
              type="dashboard"
              size={100}
              strokeWidth={9}
              percent={admin.implementation_score_average ?? 0}
              strokeColor={STATUS_COLORS.completed}
              format={() => (
                <span style={{ fontSize: 20 }}>
                  {admin.implementation_score_average != null ? `${admin.implementation_score_average}%` : '—'}
                </span>
              )}
            />
            <Text type="secondary" className="mt-2" style={{ fontSize: 12 }}>
              Overall score
            </Text>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <Progress
              type="dashboard"
              size={100}
              strokeWidth={9}
              percent={admin.uat_pass_rate}
              strokeColor={STATUS_COLORS.ongoing}
              format={() => <span style={{ fontSize: 20 }}>{admin.uat_pass_rate}%</span>}
            />
            <Text type="secondary" className="mt-2" style={{ fontSize: 12 }}>
              UAT pass rate
            </Text>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <div className="font-semibold" style={{ fontSize: 24 }}>
              {admin.total_budget.toLocaleString(undefined, { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 })}
            </div>
            <Text type="secondary" className="mt-1" style={{ fontSize: 12 }}>
              Total budget
            </Text>
          </div>

          <div
            className="flex cursor-pointer flex-col items-center justify-center text-center"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/traceability-matrix')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate('/traceability-matrix')
            }}
          >
            <div className="font-semibold underline decoration-dotted" style={{ fontSize: 24 }}>
              {admin.requirement_total}
            </div>
            <Text type="secondary" className="mt-1" style={{ fontSize: 12 }}>
              Requirements tracked
            </Text>
          </div>

          <div className="absolute inset-y-2 left-1/2 hidden w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700 sm:block" />
        </div>
      </Card>

      {/* Row 3 — phase bars (1.25fr) beside status legend (1fr) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
        <Card className="page-shell-card" title="Projects by phase">
          <PhaseBarChart
            phaseCounts={phaseCounts}
            onSelect={(stage) => navigate(projectsUrl({ lifecycleStage: stage }))}
          />
        </Card>

        <Card className="page-shell-card" title="By status">
          <div className="flex flex-col gap-2">
            {['ongoing', 'completed', 'not_started'].map((key) => (
              <div
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                role="button"
                tabIndex={0}
                onClick={() => navigate(projectsUrl({ derivedStatus: key }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate(projectsUrl({ derivedStatus: key }))
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[key] }} />
                  {STATUS_LABELS[key]}
                </span>
                <span className="font-semibold">{statusCounts[key]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4 — blockers table (1.35fr) beside overdue activities (1fr) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
        <Card className="page-shell-card" title="Transition blockers">
          <Table
            className="pms-house-table"
            rowKey={(record) => `${record.project_id}-${record.reason}`}
            size="small"
            pagination={false}
            dataSource={admin.transition_blockers}
            locale={{ emptyText: 'No projects are currently stuck at a gate.' }}
            onRow={(record) => ({
              onClick: () => goToProjectReview(record.project_id),
              className: 'cursor-pointer',
            })}
            columns={[
              { title: 'Project', dataIndex: 'project_name' },
              { title: 'Blocker', dataIndex: 'reason' },
              {
                title: 'Days',
                dataIndex: 'days_stuck',
                width: 90,
                align: 'right',
                sorter: (a, b) => a.days_stuck - b.days_stuck,
                defaultSortOrder: 'descend',
              },
            ]}
          />
        </Card>

        <Card className="page-shell-card" title="Overdue activities">
          <div
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/projects')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate('/projects')
            }}
          >
            <div className="text-3xl font-semibold" style={{ color: BRAND_MAROON }}>
              {admin.overdue_activities.total}
            </div>
            <Text type="secondary">Past planned start</Text>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {[
              { key: '1_day', label: '1 day' },
              { key: '3_days', label: '3 days' },
              { key: 'over_3_days', label: 'Over 3 days' },
            ].map((row) => (
              <div
                key={row.key}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                role="button"
                tabIndex={0}
                onClick={() => navigate('/projects')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate('/projects')
                }}
              >
                <span>{row.label}</span>
                <span className="font-semibold">{admin.overdue_activities[row.key]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 5 — awaiting action heading, five equal cards */}
      <div>
        <Title level={5} className="!mb-3">
          Awaiting action
        </Title>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <ClickableStat
            label="New registrations"
            value={admin.awaiting_action.new_registrations}
            onClick={() => navigate(projectsUrl({ q: 'Registration' }))}
          />
          <ClickableStat
            label="Plans pending review"
            value={admin.awaiting_action.plans_pending_review}
            onClick={() => navigate('/reviews?tab=plan')}
          />
          <ClickableStat
            label="Matrices pending"
            value={admin.awaiting_action.matrices_pending_approval}
            onClick={() => navigate('/traceability-matrix')}
          />
          <ClickableStat
            label="Docs pending review"
            value={admin.awaiting_action.documents_pending_review}
            onClick={() => navigate('/documents')}
          />
          <ClickableStat
            label="Closure sign-offs"
            value={admin.awaiting_action.closure_signoffs}
            onClick={() => navigate('/reviews?tab=closure')}
          />
        </div>
      </div>
    </div>
  )
}

export default AdministratorDashboard
