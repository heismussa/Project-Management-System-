import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tag, Typography, message } from 'antd'
import { ClipboardList } from 'lucide-react'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem } from '../../lib/apiHelpers'
import DataTable from '../common/DataTable'
import TintedMetricCard from './shared/TintedMetricCard'
import DashboardHeaderBanner from './shared/DashboardHeaderBanner'
import DashboardSection from './shared/DashboardSection'
import { DASHBOARD_CARD_THEMES } from './shared/chartConstants'

const { Text } = Typography

// Days waiting -> which theme the age pill borrows, and its own label —
// older is worse, so it climbs from green through amber to red.
function ageTheme(days) {
  if (days >= 5) return DASHBOARD_CARD_THEMES.red
  if (days >= 2) return DASHBOARD_CARD_THEMES.orange
  return DASHBOARD_CARD_THEMES.green
}

const QUEUE_STATS = [
  { key: 'plans_pending', label: 'Plans pending review', type: 'Plan' },
  { key: 'matrices_pending', label: 'Requirement matrices', type: 'Matrix' },
  { key: 'closure_signoffs', label: 'Closure requests', type: null },
]

function ReviewerDashboard() {
  const navigate = useNavigate()
  const [reviewer, setReviewer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/dashboard', { params: { role: 'Project Reviewer' } })
      .then((response) => {
        if (cancelled) return
        setReviewer(unwrapItem(response.data)?.reviewer ?? null)
      })
      .catch(() => {
        if (!cancelled) message.error('Could not load the review queue.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !reviewer) {
    return (
      <Card className="page-shell-card" style={{ marginTop: 0 }} loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { queue, oldest_waiting_days: oldestWaitingDays, queue_by_age: queueByAge } = reviewer

  return (
    <div>
      <DashboardHeaderBanner />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUEUE_STATS.map((stat) => {
          const oldest = stat.type ? oldestWaitingDays?.[stat.type] : null
          return (
            <TintedMetricCard
              key={stat.key}
              icon={ClipboardList}
              label={stat.label}
              value={queue[stat.key] ?? 0}
              subtext={oldest ? `oldest waiting: ${oldest} day${oldest === 1 ? '' : 's'}` : null}
              theme={oldest ? ageTheme(oldest) : DASHBOARD_CARD_THEMES.neutral}
            />
          )
        })}
      </div>

      <DashboardSection
        icon={ClipboardList}
        title="Review Queue — sorted by longest waiting"
        noPadding
        className="mt-4"
      >
        <DataTable
          hideSearch
          rowKey={(row) => `${row.project_id}-${row.type}`}
          data={queueByAge}
          emptyText="Nothing waiting on you right now."
          columns={[
            {
              title: 'Project',
              dataIndex: 'project',
              render: (value, record) => (
                <button
                  type="button"
                  className="font-medium text-[#650018] underline"
                  onClick={() => {
                    storeProjectId(record.project_id)
                    navigate(`/projects/${record.project_id}`)
                  }}
                >
                  {value}
                </button>
              ),
            },
            { title: 'Type', dataIndex: 'type', width: 140, render: (value) => <Tag>{value}</Tag> },
            {
              title: 'Submitted',
              dataIndex: 'submitted_at',
              width: 130,
              render: (value) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'),
            },
            {
              title: 'Waiting',
              dataIndex: 'days_waiting',
              width: 120,
              render: (value) => (
                <span style={{ color: ageTheme(value).accent, fontWeight: 700 }}>
                  {value} day{value === 1 ? '' : 's'}
                </span>
              ),
            },
            {
              title: 'Action',
              width: 100,
              render: (_, record) => (
                <button
                  type="button"
                  className="font-semibold text-[#650018]"
                  onClick={() => {
                    storeProjectId(record.project_id)
                    navigate(`/projects/${record.project_id}`)
                  }}
                >
                  Review
                </button>
              ),
            },
          ]}
        />
      </DashboardSection>
    </div>
  )
}

export default ReviewerDashboard
