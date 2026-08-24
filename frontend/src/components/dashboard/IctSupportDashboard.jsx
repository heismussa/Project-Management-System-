import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Table, Typography, message } from 'antd'
import {
  Users,
  UserCheck,
  UserX,
  KeyRound,
  UserRoundSearch,
  CircleCheck,
  Clock,
  Bell,
  AlertCircle,
} from 'lucide-react'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'

const { Text } = Typography

const MAROON = '#962c30'
const GREEN = '#068737'
const RED = '#a32d2d'
const AMBER_DARK = '#b97900'
const AMBER = '#ffc20a'

const ROLE_LABELS = {
  'Project Planner': 'Project Planner',
  'Project Implementor': 'Project Implementor',
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
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function MetricCard({ icon: Icon, color, label, value }) {
  return (
    <Card className="page-shell-card" styles={{ body: { padding: 20 } }}>
      <div className="flex flex-col items-center text-center">
        <Icon size={22} color={color} />
        <Text type="secondary" className="mt-2 text-xs">
          {label}
        </Text>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
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
  const navigate = useNavigate()
  const [ict, setIct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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

  const { metrics, users_without_roles: usersWithoutRoles, users_by_role: usersByRole, recent_activity: recentActivity, notification_engine: notificationEngine } = ict
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

      {/* 2 — users without roles, highest priority */}
      <div
        className="flex cursor-pointer items-center gap-4 rounded-xl px-6 py-5"
        style={{ background: '#fcebeb', borderRadius: 12 }}
        role="button"
        tabIndex={0}
        onClick={() => navigate('/user-management?filter=no-role')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') navigate('/user-management?filter=no-role')
        }}
      >
        <UserRoundSearch size={40} color={MAROON} className="shrink-0" />
        <div className="flex-1">
          <div className="font-semibold" style={{ color: MAROON }}>
            Users without roles
          </div>
          <Text type="secondary" className="text-sm">
            These accounts cannot access any part of the system
          </Text>
        </div>
        <div className="shrink-0 font-semibold" style={{ color: MAROON, fontSize: 32 }}>
          {usersWithoutRoles}
        </div>
      </div>

      {/* 3 — users by role */}
      <Card className="page-shell-card" title="Users by role">
        <div className="flex flex-col gap-3">
          {usersByRole.map((row) => (
            <RoleBar key={row.role} label={row.role} count={row.count} maxCount={maxRoleCount} />
          ))}
        </div>
      </Card>

      {/* 4 — recent activity (1.4fr) beside notification engine (1fr) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card className="page-shell-card" title="Recent account activity">
          <Table
            rowKey={(record) => `${record.user}-${record.action}-${record.when}`}
            size="small"
            pagination={false}
            dataSource={recentActivity}
            locale={{ emptyText: 'No recent account activity.' }}
            columns={[
              { title: 'User', dataIndex: 'user' },
              { title: 'Action', dataIndex: 'action', render: (value) => ACTION_LABELS[value] ?? value },
              { title: 'When', dataIndex: 'when', width: 80, align: 'right', render: (value) => relativeTime(value) },
            ]}
          />
        </Card>

        <Card className="page-shell-card" title="Notification engine">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CircleCheck size={18} color={GREEN} />
              <span>Scheduler running</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              <Text type="secondary">Last run {relativeTime(notificationEngine.last_run_at)}</Text>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell size={18} color={AMBER} />
                Alerts sent today
              </span>
              <span className="font-semibold">{notificationEngine.alerts_sent_today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle size={18} color={RED} />
                Failed deliveries
              </span>
              <span className="font-semibold">{notificationEngine.failed_deliveries}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default IctSupportDashboard
