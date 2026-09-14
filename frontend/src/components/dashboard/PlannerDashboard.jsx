import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, RotateCcw, Clock, Layers } from 'lucide-react'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem } from '../../lib/apiHelpers'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../utility/Config.jsx'
import DataTable from '../common/DataTable'
import TintedMetricCard from './shared/TintedMetricCard'
import DashboardHeaderBanner from './shared/DashboardHeaderBanner'
import DashboardSection from './shared/DashboardSection'
import { DASHBOARD_CARD_THEMES } from './shared/chartConstants'

const STAGE_COLORS = { planning: '#ffc20a', execution: '#2E9E55', closure: '#C2410C' }
const STAGE_LABELS = { planning: 'Planning', execution: 'Execution', closure: 'Closure' }

function StageBar({ breakdown }) {
  const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0)
  if (!total) return <div className="text-sm text-gray-500">No assigned projects yet.</div>

  return (
    <div>
      <div className="flex" style={{ height: 20, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
        {Object.entries(breakdown).map(([stage, count]) =>
          count > 0 ? (
            <div key={stage} style={{ width: `${(count / total) * 100}%`, background: STAGE_COLORS[stage] }} />
          ) : null,
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-5">
        {Object.entries(breakdown).map(([stage, count]) => (
          <span key={stage} className="flex items-center gap-1.5 text-xs">
            <span
              style={{ width: 9, height: 9, borderRadius: '50%', background: STAGE_COLORS[stage] }}
              className="inline-block"
            />
            {STAGE_LABELS[stage]} <b>{count}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PlannerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [payload, setPayload] = useState(null)

  useEffect(() => {
    api.get('/dashboard', { params: { role: ROLES.PPL } }).then((response) => {
      setPayload(unwrapItem(response.data))
    })
  }, [user?.id])

  const open = (projectId) => {
    storeProjectId(projectId)
    navigate(`/projects/${projectId}?tab=plan`)
  }

  const counts = payload?.counts || {}
  const planner = payload?.planner || { overdue_activities: [], needs_rework: [], stage_breakdown: {} }

  return (
    <div>
      <DashboardHeaderBanner />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TintedMetricCard
          icon={Clock}
          label="Overdue activities"
          value={counts.overdue_activities ?? 0}
          subtext="past their planned end date"
          theme={DASHBOARD_CARD_THEMES.red}
        />
        <TintedMetricCard
          icon={RotateCcw}
          label="Needs rework"
          value={planner.needs_rework.length}
          subtext="rejected requirements / plan changes"
          theme={DASHBOARD_CARD_THEMES.orange}
        />
        <TintedMetricCard
          icon={FolderKanban}
          label="Assigned projects"
          value={counts.assigned_projects ?? 0}
          theme={DASHBOARD_CARD_THEMES.neutral}
        />
      </div>

      <DashboardSection icon={Clock} title="Overdue Activities" noPadding className="mt-4">
        <DataTable
          hideSearch
          rowKey={(row) => `${row.project_id}-${row.activity}`}
          data={planner.overdue_activities}
          emptyText="Nothing overdue — you're caught up."
          columns={[
            {
              title: 'Project',
              dataIndex: 'project_name',
              render: (value, record) => (
                <button type="button" className="font-medium text-[#650018] underline" onClick={() => open(record.project_id)}>
                  {value}
                </button>
              ),
            },
            { title: 'Activity', dataIndex: 'activity' },
            {
              title: 'Planned End',
              dataIndex: 'planned_end_date',
              width: 130,
              render: (value) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'),
            },
            {
              title: 'Days Overdue',
              dataIndex: 'days_overdue',
              width: 120,
              render: (value) => <span style={{ color: '#C0392B', fontWeight: 700 }}>{value}</span>,
            },
            { title: 'Responsible', dataIndex: 'responsible', width: 160 },
          ]}
        />
      </DashboardSection>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardSection icon={RotateCcw} title="Needs Rework" noPadding>
          <DataTable
            hideSearch
            rowKey={(row) => `${row.project_id}-${row.label}`}
            data={planner.needs_rework}
            emptyText="Nothing rejected right now."
            columns={[
              {
                title: 'Item',
                render: (_, record) => (
                  <div>
                    <button type="button" className="font-medium text-[#650018] underline" onClick={() => open(record.project_id)}>
                      {record.project_name}
                    </button>
                    <div className="text-xs text-gray-500">{record.label}</div>
                  </div>
                ),
                searchValue: (record) => `${record.project_name} ${record.label}`,
              },
              { title: 'Reason', dataIndex: 'reason', render: (value) => value || '—' },
            ]}
          />
        </DashboardSection>

        <DashboardSection icon={Layers} title="Projects by Stage" bodyStyle={{ padding: 20 }}>
          <StageBar breakdown={planner.stage_breakdown} />
        </DashboardSection>
      </div>
    </div>
  )
}
