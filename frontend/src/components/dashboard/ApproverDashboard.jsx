import { useEffect, useState } from 'react'
import { Button, Tag, message } from 'antd'
import { CheckCircle, ClipboardCheck } from 'lucide-react'
import api from '../../lib/axios'
import { storeProjectId, unwrapItem } from '../../lib/apiHelpers'
import ApproverSignOffModal from '../reviews/ApproverSignOffModal'
import DataTable from '../common/DataTable'
import TintedMetricCard from './shared/TintedMetricCard'
import DashboardHeaderBanner from './shared/DashboardHeaderBanner'
import DashboardSection from './shared/DashboardSection'
import { DASHBOARD_CARD_THEMES } from './shared/chartConstants'

const ACTION_BTN_STYLE = { backgroundColor: '#800000', borderColor: '#800000' }

function ByPathCard({ dict, recommended }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: '20px 24px', height: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
        Awaiting sign-off, by path
      </div>
      <div className="flex gap-7">
        <div style={{ flex: 1, paddingRight: 24, borderRight: '1px solid #f2f0f0' }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#962c30' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280' }}>DICT — direct</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>{dict}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D4ED8' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280' }}>SDMM / IDMM — recommended</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>{recommended}</div>
        </div>
      </div>
    </div>
  )
}

export default function ApproverDashboard() {
  const [approver, setApprover] = useState({ awaiting_dict: 0, awaiting_recommended: 0, signed_off_this_week: 0, projects: [] })
  const [signOffTarget, setSignOffTarget] = useState(null)

  const refresh = () =>
    api
      .get('/dashboard', { params: { role: 'Project Approver' } })
      .then((response) => setApprover(unwrapItem(response.data)?.approver ?? approver))
      .catch(() => message.error('Could not load the sign-off queue.'))

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load, refresh() closes over stale state harmlessly since it only reads on success
  }, [])

  const open = (row) => {
    storeProjectId(row.project_id)
    setSignOffTarget({ id: row.project_id, name: row.project_name, planner: { name: row.planner } })
  }

  return (
    <div className="flex flex-col gap-3">
      <DashboardHeaderBanner subtitle="DICT projects direct, plus SDMM / IDMM already recommended — waiting on your sign-off" />

      <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <ByPathCard dict={approver.awaiting_dict} recommended={approver.awaiting_recommended} />
        <TintedMetricCard
          icon={CheckCircle}
          label="Signed off this week"
          value={approver.signed_off_this_week}
          theme={DASHBOARD_CARD_THEMES.green}
        />
      </div>

      <DashboardSection icon={ClipboardCheck} title="Execution Sign-off Queue" noPadding>
        <DataTable
          hideSearch
          rowKey="project_id"
          data={approver.projects}
          emptyText="Nothing waiting for sign-off."
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
              title: 'Path',
              dataIndex: 'path',
              width: 140,
              render: (value) =>
                value === 'direct' ? <Tag color="red">Direct</Tag> : <Tag color="blue">Recommended</Tag>,
            },
            {
              title: 'Action',
              width: 120,
              align: 'center',
              render: (_, record) => (
                <Button type="primary" style={ACTION_BTN_STYLE} onClick={() => open(record)}>
                  Sign off
                </Button>
              ),
            },
          ]}
        />
      </DashboardSection>

      <ApproverSignOffModal
        open={Boolean(signOffTarget)}
        project={signOffTarget}
        onClose={() => setSignOffTarget(null)}
        onCompleted={() => {
          refresh()
        }}
      />
    </div>
  )
}
