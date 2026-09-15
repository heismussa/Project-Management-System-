import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Tag, Typography, message } from 'antd'
import { Users, UserCheck, UserX, KeyRound, ShieldAlert, History, ArrowRight, UserCog, ShieldCheck } from 'lucide-react'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'
import TintedMetricCard from './shared/TintedMetricCard'
import DashboardHeaderBanner from './shared/DashboardHeaderBanner'
import DashboardSection from './shared/DashboardSection'
import ActivityRow from './shared/ActivityRow'
import RoleBar from './shared/RoleBar'
import { relativeTime } from './shared/relativeTime'
import { DASHBOARD_CARD_THEMES } from './shared/chartConstants'

const { Text } = Typography

const SECURITY_LABELS = {
  login_failed: 'Failed login',
  access_denied: 'Access denied',
  account_created: 'Account created',
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

  if (loading || !admin) {
    return (
      <Card className="page-shell-card" style={{ marginTop: 0 }} loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const {
    metrics,
    users_by_role: usersByRole,
    users_without_roles: usersWithoutRoles,
    recent_activity: recentActivity,
    security_highlights: security,
    notification_engine: notifications,
  } = admin
  const maxRoleCount = Math.max(1, ...usersByRole.map((row) => row.count))

  return (
    <div className="flex flex-col gap-3">
      <DashboardHeaderBanner />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TintedMetricCard icon={Users} label="Total users" value={metrics.total_users} theme={DASHBOARD_CARD_THEMES.neutral} />
        <TintedMetricCard icon={UserCheck} label="Active accounts" value={metrics.active_accounts} theme={DASHBOARD_CARD_THEMES.green} />
        <TintedMetricCard icon={UserX} label="Disabled accounts" value={metrics.disabled_accounts} theme={DASHBOARD_CARD_THEMES.red} />
        <TintedMetricCard icon={KeyRound} label="Password resets" value={metrics.password_resets} theme={DASHBOARD_CARD_THEMES.amber} />
      </div>

      {usersWithoutRoles > 0 && (
        <Card
          className="page-shell-card"
          style={{ marginTop: 0, background: '#FFF8F3', borderColor: '#F4DCC7' }}
          styles={{ body: { padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={19} color="#C2410C" />
            <Text style={{ color: '#C2410C', fontWeight: 600 }}>
              {usersWithoutRoles} account{usersWithoutRoles === 1 ? '' : 's'} with no role assigned
            </Text>
          </div>
          <Button size="small" onClick={() => navigate('/user-management')}>
            Review <ArrowRight size={13} />
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardSection icon={UserCog} title="Users by Role" bodyStyle={{ padding: '18px 20px' }}>
          <div className="flex flex-col gap-3">
            {usersByRole.map((row) => (
              <RoleBar key={row.role} label={row.role} count={row.count} maxCount={maxRoleCount} />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection icon={Users} title="User Management — recent changes" bodyStyle={{ padding: '4px 20px 14px' }}>
          {recentActivity.length === 0 ? (
            <Text type="secondary">No recent account changes.</Text>
          ) : (
            recentActivity.map((event, index) => (
              <ActivityRow key={index} label={event.action} sub={event.user} when={relativeTime(event.when)} severity="neutral" />
            ))
          )}
        </DashboardSection>
      </div>

      <DashboardSection icon={ShieldCheck} title="Audit Log — recent highlights" bodyStyle={{ padding: '4px 20px 14px' }}>
        {security.length === 0 ? (
          <Text type="secondary">No recent security events.</Text>
        ) : (
          security.map((event, index) => (
            <ActivityRow
              key={index}
              label={SECURITY_LABELS[event.action] || event.action}
              sub={event.who}
              when={relativeTime(event.when)}
              severity={event.action === 'login_failed' || event.action === 'access_denied' ? 'danger' : 'neutral'}
            />
          ))
        )}
      </DashboardSection>

      <Card className="page-shell-card" style={{ marginTop: 0 }} styles={{ body: { padding: '16px 20px' } }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <History size={17} color="#6b7280" />
            <Text type="secondary" className="text-sm">
              Notification scheduler
            </Text>
            <Tag color={notifications.scheduler_running ? 'green' : 'red'}>
              {notifications.scheduler_running ? 'Running' : 'Stopped'}
            </Tag>
          </div>
          <Text type="secondary" className="text-xs">
            {notifications.alerts_sent_today} alert{notifications.alerts_sent_today === 1 ? '' : 's'} sent today
            {notifications.last_run_at ? ` · last run ${relativeTime(notifications.last_run_at)}` : ''}
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default AdministratorDashboard
