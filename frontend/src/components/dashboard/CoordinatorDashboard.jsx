import { useEffect, useState } from 'react'
import { Button, Tag, message } from 'antd'
import { Inbox } from 'lucide-react'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem } from '../../lib/apiHelpers'
import CoordinatorRecommendationModal from '../reviews/CoordinatorRecommendationModal'
import DataTable from '../common/DataTable'
import TintedMetricCard from './shared/TintedMetricCard'
import DashboardHeaderBanner from './shared/DashboardHeaderBanner'
import DashboardSection from './shared/DashboardSection'
import { DASHBOARD_CARD_THEMES } from './shared/chartConstants'

const ACTION_BTN_STYLE = { backgroundColor: '#800000', borderColor: '#800000' }

function ReadyBlockedCard({ ready, blocked }) {
  const total = ready + blocked
  const readyPct = total ? Math.round((ready / total) * 100) : 0
  const blockedPct = total ? 100 - readyPct : 0

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: '20px 22px', height: '100%' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#9CA3AF' }}>
          Ready vs. blocked
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#2E9E55' }} />
            Ready <b>{ready}</b>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#C2410C' }} />
            Blocked <b>{blocked}</b>
          </span>
        </div>
      </div>
      {total ? (
        <div className="flex" style={{ height: 22, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
          {ready > 0 && (
            <div
              style={{
                width: `${readyPct}%`,
                background: '#2E9E55',
                borderRadius: blocked > 0 ? '6px 0 0 6px' : 6,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 10,
                color: '#fff',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              {readyPct}%
            </div>
          )}
          {blocked > 0 && (
            <div
              style={{
                width: `${blockedPct}%`,
                background: '#C2410C',
                borderRadius: ready > 0 ? '0 6px 6px 0' : 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 10,
                color: '#fff',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              {blockedPct}%
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500">Nothing waiting on you right now.</div>
      )}
    </div>
  )
}

export default function CoordinatorDashboard() {
  const [coordinator, setCoordinator] = useState({ awaiting_recommendation: 0, ready: 0, blocked: 0, projects: [] })
  const [reviewTarget, setReviewTarget] = useState(null)

  const refresh = () =>
    api
      .get('/dashboard', { params: { role: 'Project Coordinator' } })
      .then((response) => setCoordinator(unwrapItem(response.data)?.coordinator ?? coordinator))
      .catch(() => message.error('Could not load the recommendation queue.'))

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load, refresh() closes over stale state harmlessly since it only reads on success
  }, [])

  const open = (row) => {
    storeProjectId(row.project_id)
    setReviewTarget({ id: row.project_id, name: row.project_name, planner: { name: row.planner } })
  }

  return (
    <div className="flex flex-col gap-3">
      <DashboardHeaderBanner subtitle="SDMM / IDMM projects with an approved plan, waiting on your recommendation" />

      <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: '280px 1fr' }}>
        <TintedMetricCard
          icon={Inbox}
          label="Awaiting recommendation"
          value={coordinator.awaiting_recommendation}
          theme={DASHBOARD_CARD_THEMES.neutral}
        />
        <ReadyBlockedCard ready={coordinator.ready} blocked={coordinator.blocked} />
      </div>

      <DashboardSection icon={Inbox} title="Awaiting Recommendation" noPadding>
        <DataTable
          hideSearch
          rowKey="project_id"
          data={coordinator.projects}
          emptyText="No projects waiting for recommendation."
          columns={[
            {
              title: 'Project Name',
              dataIndex: 'project_name',
              render: (value, record) => (
                <button type="button" className="font-medium text-[#650018] hover:opacity-80" onClick={() => open(record)}>
                  {value}
                </button>
              ),
            },
            { title: 'Track', dataIndex: 'track', width: 100, render: (value) => <Tag color="blue">{value}</Tag> },
            { title: 'Planner', dataIndex: 'planner', width: 180 },
            {
              title: 'Status',
              width: 260,
              render: (_, record) =>
                record.ready ? (
                  <Tag color="green">Ready</Tag>
                ) : (
                  <span style={{ color: '#C2410C', fontSize: 12.5 }}>
                    <Tag color="orange">Blocked</Tag>
                    {record.blocker}
                  </span>
                ),
            },
            {
              title: 'Action',
              width: 110,
              align: 'center',
              render: (_, record) => (
                <Button type="primary" style={ACTION_BTN_STYLE} onClick={() => open(record)}>
                  View
                </Button>
              ),
            },
          ]}
        />
      </DashboardSection>

      <CoordinatorRecommendationModal
        open={Boolean(reviewTarget)}
        project={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onCompleted={() => {
          refresh()
        }}
      />
    </div>
  )
}
