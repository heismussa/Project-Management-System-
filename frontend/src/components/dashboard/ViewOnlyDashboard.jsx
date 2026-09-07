import { useEffect, useState } from 'react'
import { Alert, Card, Progress, Table, Typography, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'
import { DASHBOARD_CARD_STYLE } from './chartConstants'

const { Text } = Typography

const GREEN = '#068737'
const AMBER = '#ffc20a'
const GREY = '#b4b2a9'
const STATUS_COLORS = { ongoing: AMBER, completed: GREEN, not_started: GREY }
const STATUS_LABELS = { ongoing: 'Ongoing', completed: 'Completed', not_started: 'Not started' }
const REQUIREMENT_SEGMENTS = [
  { key: 'pending', label: 'Pending', color: GREY },
  { key: 'ongoing', label: 'Ongoing', color: AMBER },
  { key: 'completed', label: 'Completed', color: GREEN },
]

function MetricCard({ label, value }) {
  return (
    <Card className="page-shell-card" style={DASHBOARD_CARD_STYLE} styles={{ body: { padding: 20 } }}>
      <Text type="secondary">{label}</Text>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </Card>
  )
}

function RequirementStackedBar({ counts }) {
  const total = counts.pending + counts.ongoing + counts.completed

  return (
    <div>
      <div className="flex w-full overflow-hidden" style={{ height: 22, borderRadius: 5 }}>
        {total === 0 ? (
          <div className="w-full bg-gray-100 dark:bg-gray-700" />
        ) : (
          REQUIREMENT_SEGMENTS.map(
            (segment) =>
              counts[segment.key] > 0 && (
                <div
                  key={segment.key}
                  style={{ width: `${(counts[segment.key] / total) * 100}%`, background: segment.color }}
                />
              ),
          )
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-4">
        {REQUIREMENT_SEGMENTS.map((segment) => (
          <span key={segment.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: segment.color }} />
            <Text type="secondary">{segment.label}</Text>
            <span className="font-semibold">{counts[segment.key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ViewOnlyDashboard() {
  const [viewOnly, setViewOnly] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/dashboard', { params: { role: 'Project ViewOnly' } })
      .then((response) => {
        if (cancelled) return
        setViewOnly(unwrapItem(response.data)?.view_only ?? null)
      })
      .catch(() => {
        if (!cancelled) message.error('Could not load the dashboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !viewOnly) {
    return (
      <Card className="page-shell-card" loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { status_counts: statusCounts, requirement_status_counts: requirementCounts, projects } = viewOnly

  return (
    <div className="flex flex-col gap-3">
      {/* 1 — view-only banner */}
      <Alert
        type="info"
        showIcon
        icon={<EyeOutlined />}
        message="View-only access. No actions can be performed."
      />

      {/* 2 — four equal metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total projects" value={statusCounts.total} />
        <MetricCard label="Ongoing" value={statusCounts.ongoing} />
        <MetricCard label="Completed" value={statusCounts.completed} />
        <MetricCard
          label="Total budget"
          value={viewOnly.total_budget.toLocaleString(undefined, {
            style: 'currency',
            currency: 'TZS',
            maximumFractionDigits: 0,
          })}
        />
      </div>

      {/* 3 — implementation score panel */}
      <Card className="page-shell-card" title="Implementation score">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex flex-col items-center">
            <Progress
              type="dashboard"
              size={84}
              percent={viewOnly.implementation_score_average ?? 0}
              strokeColor={GREEN}
              format={() => (viewOnly.implementation_score_average != null ? `${viewOnly.implementation_score_average}%` : '—')}
            />
            <Text type="secondary" className="mt-2" style={{ fontSize: 12 }}>
              Overall score
            </Text>
          </div>

          <div className="flex flex-col items-center">
            <Progress type="dashboard" size={84} percent={viewOnly.uat_pass_rate} strokeColor={AMBER} format={() => `${viewOnly.uat_pass_rate}%`} />
            <Text type="secondary" className="mt-2" style={{ fontSize: 12 }}>
              UAT pass rate
            </Text>
          </div>

          <div className="hidden self-stretch border-l border-gray-200 dark:border-gray-700 sm:block" />

          <div className="min-w-[240px] flex-1">
            <Text type="secondary" className="mb-2 block">
              Requirements across all projects
            </Text>
            <RequirementStackedBar counts={requirementCounts} />
          </div>
        </div>
      </Card>

      {/* 4 — status legend */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="page-shell-card" title="Projects by status">
          <div className="flex flex-col gap-2">
            {['ongoing', 'completed', 'not_started'].map((key) => (
              <div key={key} className="flex items-center justify-between px-2 py-2">
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

      {/* 5 — project progress table */}
      <Card className="page-shell-card" title="Project progress">
        <Table
          className="pms-house-table"
          rowKey="id"
          size="small"
          dataSource={projects}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
            { title: 'Project', dataIndex: 'name' },
            { title: 'Category', dataIndex: 'category', render: (value) => value || '—' },
            {
              title: 'Score',
              dataIndex: 'overall_implementation_score',
              width: 100,
              align: 'right',
              render: (value) => (value != null ? `${value}%` : '—'),
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default ViewOnlyDashboard
