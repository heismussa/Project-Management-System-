import { useEffect, useState } from 'react'
import { Card, Tag, Typography, message } from 'antd'
import { Users, UserCheck, UserX, KeyRound, ShieldAlert, UserCog } from 'lucide-react'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'
import DataTable from '../common/DataTable'
import TintedMetricCard from './shared/TintedMetricCard'
import DashboardHeaderBanner from './shared/DashboardHeaderBanner'
import DashboardSection from './shared/DashboardSection'
import RoleBar from './shared/RoleBar'
import { relativeTime } from './shared/relativeTime'
import { DASHBOARD_CARD_THEMES } from './shared/chartConstants'

const { Text } = Typography

function IctSupportDashboard() {
  const [ict, setIct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/dashboard', { params: { role: 'ICT Support' } })
      .then((response) => {
        if (cancelled) return
        setIct(unwrapItem(response.data)?.ict_support ?? null)
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

  if (loading || !ict) {
    return (
      <Card className="page-shell-card" style={{ marginTop: 0 }} loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { metrics, users_by_role: usersByRole, flagged_accounts: flagged = [] } = ict
  const maxRoleCount = Math.max(1, ...usersByRole.map((row) => row.count))

  return (
    <div className="flex flex-col gap-4">
      <DashboardHeaderBanner subtitle="User accounts, roles, and security signals" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TintedMetricCard icon={Users} label="Total users" value={metrics.total_users} theme={DASHBOARD_CARD_THEMES.neutral} />
        <TintedMetricCard icon={UserCheck} label="Active accounts" value={metrics.active_accounts} theme={DASHBOARD_CARD_THEMES.green} />
        <TintedMetricCard icon={UserX} label="Disabled accounts" value={metrics.disabled_accounts} theme={DASHBOARD_CARD_THEMES.red} />
        <TintedMetricCard icon={KeyRound} label="Password resets" value={metrics.password_resets} theme={DASHBOARD_CARD_THEMES.amber} />
      </div>

      <DashboardSection icon={ShieldAlert} title="Flagged Accounts" noPadding>
        <DataTable
          hideSearch
          rowKey={(record, index) => `${record.user}-${index}`}
          data={flagged}
          emptyText="Nothing needs attention right now."
          columns={[
            { title: 'User', dataIndex: 'user' },
            {
              title: 'Issue',
              dataIndex: 'issue',
              render: (value) => <Tag color="red">{value}</Tag>,
            },
            { title: 'Last Attempt', dataIndex: 'when', width: 140, align: 'right', render: (value) => relativeTime(value) },
          ]}
        />
      </DashboardSection>

      <DashboardSection icon={UserCog} title="Users by Role">
        <div className="flex flex-col gap-3">
          {usersByRole.map((row) => (
            <RoleBar key={row.role} label={row.role} count={row.count} maxCount={maxRoleCount} />
          ))}
        </div>
      </DashboardSection>
    </div>
  )
}

export default IctSupportDashboard
