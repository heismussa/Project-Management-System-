import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, Statistic, Typography } from 'antd'
import api from '../lib/axios'
import { unwrapItem } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'

const { Title, Paragraph } = Typography

const METRIC_LABELS = {
  new_registrations: 'New registrations',
  plans_pending_review: 'Plans pending review',
  awaiting_recommendation: 'Awaiting recommendation',
  awaiting_execution_sign_off: 'Awaiting execution sign-off',
  in_execution: 'In execution',
  closed: 'Closed projects',
  assigned_projects: 'Assigned projects',
  active_activities: 'Activities',
  pending_matrix_items: 'Pending matrix items',
  overdue_activities: 'Overdue activities',
  completion_docs: 'Completion documents',
}

function DashboardPage() {
  const navigate = useNavigate()
  const { activeRole } = useAuth()
  const [payload, setPayload] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/dashboard', { params: { role: activeRole?.name } })
      .then((response) => {
        if (!cancelled) setPayload(unwrapItem(response.data))
      })
      .catch(() => {
        if (!cancelled) setPayload({ counts: {}, pending_actions: [] })
      })
    return () => {
      cancelled = true
    }
  }, [activeRole?.name])

  const metrics = useMemo(() => {
    const counts = payload?.counts || {}
    return Object.entries(METRIC_LABELS)
      .filter(([key]) => counts[key] != null)
      .map(([key, label]) => ({ key, label, value: counts[key] }))
  }, [payload])

  return (
    <div>
      
      <Paragraph type="secondary">
        Project overview and key metrics for {activeRole?.name || 'your account'}.
      </Paragraph>

      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col xs={24} sm={12} lg={8} key={metric.key}>
            <Card className="page-shell-card">
              <Statistic title={metric.label} value={metric.value} />
            </Card>
          </Col>
        ))}
      </Row>

      {(payload?.pending_actions || []).length > 0 && (
        <Card className="page-shell-card mt-4" title="Pending actions">
          <ul className="m-0 list-disc space-y-2 pl-5">
            {payload.pending_actions.map((action) => (
              <li key={action.path}>
                <button
                  type="button"
                  className="text-[#650018] underline"
                  onClick={() => navigate(action.path)}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export default DashboardPage
