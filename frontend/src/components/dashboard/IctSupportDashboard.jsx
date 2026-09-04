import { useEffect, useState } from 'react'
import { Card, Typography, message } from 'antd'
import { Users, UserCheck, UserX, KeyRound } from 'lucide-react'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'
import DataTable from '../common/DataTable'
import { DASHBOARD_CARD_STYLE } from './chartConstants'

const { Text } = Typography

const MAROON = '#962c30'
const GREEN = '#068737'
const RED = '#a32d2d'
const AMBER_DARK = '#b97900'

const ROLE_LABELS = {
  'Project Planner': 'Project Planner',
  'Project Reviewer': 'Project Reviewer',
  'Project ViewOnly': 'Project ViewOnly',
  'Project Coordinator': 'Project Coordinator',
  'Project Approver': 'Project Approver',
  'Project Administrator': 'Project Administrator',
}

const ACTION_LABELS = {
  role_assigned: 'Role assigned',
  password_reset: 'Password reset',
  account_created: 'Account created',
  account_disabled: 'Account disabled',
  account_enabled: 'Account enabled',
}

function relativeTime(value) {
  if (!value) return '—'
  const diffMs = Date.now() - new Date(value).getTime()
  const hours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)))
  if (hours < 1) return 'now'
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

function MetricCard({ icon: Icon, color, label, value }) {
  return (
    <Card className="page-shell-card" style={DASHBOARD_CARD_STYLE} styles={{ body: { padding: 20 } }}>
      <div className="flex flex-col items-center text-center">
        <Icon size={22} color={color} />
        <Text type="secondary" className="mt-2 text-xs">
          {label}
        </Text>
        <div className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</div>
      </div>
    </Card>
  )
}

function RoleBar({ label, count, maxCount }) {
  return (
    <div className="flex items-center gap-3">
      <Text type="secondary" className="shrink-0 text-xs" style={{ width: 112 }}>
        {ROLE_LABELS[label] ?? label}
      </Text>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, background: MAROON }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold">{count}</span>
    </div>
  )
}

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
      <Card className="page-shell-card" loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { metrics, users_by_role: usersByRole, recent_activity: recentActivity } = ict
  const maxRoleCount = Math.max(1, ...usersByRole.map((row) => row.count))

  return (
    <div className="flex flex-col gap-3">
      {/* 1 — four equal metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} color={MAROON} label="Total users" value={metrics.total_users} />
        <MetricCard icon={UserCheck} color={GREEN} label="Active accounts" value={metrics.active_accounts} />
        <MetricCard icon={UserX} color={RED} label="Disabled accounts" value={metrics.disabled_accounts} />
        <MetricCard icon={KeyRound} color={AMBER_DARK} label="Password resets" value={metrics.password_resets} />
      </div>

      {/* 2 — users by role */}
      <Card className="page-shell-card" title="Users by role">
        <div className="flex flex-col gap-3">
          {usersByRole.map((row) => (
            <RoleBar key={row.role} label={row.role} count={row.count} maxCount={maxRoleCount} />
          ))}
        </div>
      </Card>

      {/* 4 — recent activity */}
      <Card className="page-shell-card" title="Recent account activity" styles={{ body: { padding: 0 } }}>
        <DataTable
          rowKey={(record) => `${record.user}-${record.action}-${record.when}`}
          data={recentActivity}
          searchPlaceholder="Search recent activity..."
          emptyText="No recent account activity."
          columns={[
            { title: 'User', dataIndex: 'user' },
            { title: 'Action', dataIndex: 'action', render: (value) => ACTION_LABELS[value] ?? value, searchValue: (record) => ACTION_LABELS[record.action] ?? record.action },
            { title: 'When', dataIndex: 'when', width: 130, align: 'right', render: (value) => relativeTime(value) },
          ]}
        />
      </Card>
    </div>
  )
}

export default IctSupportDashboard
