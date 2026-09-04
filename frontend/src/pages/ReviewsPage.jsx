import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Table, Tag, message } from 'antd'
import ReviewWorkspaceDrawer, { ReviewWorkspacePanel } from '../components/reviews/ReviewWorkspaceDrawer'
import CoordinatorRecommendationModal from '../components/reviews/CoordinatorRecommendationModal'
import api from '../lib/axios'
import { getStoredProjectId, storeProjectId, unwrapList } from '../lib/apiHelpers'
import { useActiveRoleName } from '../components/common/RoleGuard'
import { ROLES } from '../utility/Config.jsx'

const QUEUE_LABELS = {
  plan_review: 'Plan review',
  recommendation: 'Recommendation',
  execution_sign_off: 'Execution sign-off',
  closure_sign_off: 'Closure sign-off',
}

const REVIEW_BTN_STYLE = { backgroundColor: '#800000', borderColor: '#800000' }

function ReviewsPage({ embedded = false, queueFilter = null } = {}) {
  const { id: routeId } = useParams()
  const roleName = useActiveRoleName()
  const isApprover = roleName === ROLES.PAP
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [reviewTarget, setReviewTarget] = useState(null)
  const [projectId, setProjectId] = useState(() => {
    const fromRoute = Number(routeId)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      return fromRoute
    }
    const fromQuery = Number(searchParams.get('projectId'))
    return Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : getStoredProjectId()
  })

  useEffect(() => {
    const fromRoute = Number(routeId)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      setProjectId(fromRoute)
    }
  }, [routeId])

  useEffect(() => {
    api
      .get('/projects')
      .then((response) => {
        const list = unwrapList(response.data)
        setProjects(list)
        if (!embedded) return
        setProjectId((current) => {
          if (current && list.some((project) => project.id === current)) return current
          const first = list[0]?.id ?? null
          storeProjectId(first)
          return first
        })
      })
      .catch((err) => message.error(err.response?.data?.message || 'Could not load queue.'))
  }, [embedded])

  const refreshQueue = useCallback(async () => {
    const list = unwrapList((await api.get('/projects')).data)
    setProjects(list)
  }, [])

  const queueRows = useMemo(() => {
    return projects
      .filter((project) => {
        const queue = project.workflow?.queue
        if (!QUEUE_LABELS[queue]) return false
        if (queueFilter) return queue === queueFilter
        if (isApprover) return (project.workflow?.review_track || project.review_track) === 'DICT'
        return true
      })
      .map((project) => ({
        ...project,
        queue: project.workflow?.queue,
      }))
  }, [projects, queueFilter, isApprover])

  if (embedded) {
    return (
      <ReviewWorkspacePanel
        projectId={projectId}
        projectName={projects.find((item) => item.id === projectId)?.name}
        onChanged={refreshQueue}
      />
    )
  }

  return (
    <div>
      <Card className="page-shell-card">
        <Table
          className="pms-house-table"
          rowKey="id"
          pagination={{ pageSize: 8 }}
          dataSource={queueRows}
          locale={{ emptyText: 'Nothing in this queue.' }}
          columns={[
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
            { title: 'Project', dataIndex: 'name' },
            {
              title: 'Queue',
              dataIndex: 'queue',
              render: (value) => <Tag>{QUEUE_LABELS[value] || value}</Tag>,
            },
            { title: 'Planner', render: (_, record) => record.planner?.name || '—' },
            {
              title: 'Action',
              width: 130,
              align: 'center',
              render: (_, record) => (
                <Button
                  type="primary"
                  style={REVIEW_BTN_STYLE}
                  onClick={() => {
                    storeProjectId(record.id)
                    setReviewTarget(record)
                  }}
                >
                  Review
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {queueFilter === 'recommendation' ? (
        <CoordinatorRecommendationModal
          open={Boolean(reviewTarget)}
          project={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onCompleted={() => {
            refreshQueue().catch(() => {})
          }}
        />
      ) : (
        <ReviewWorkspaceDrawer
          open={Boolean(reviewTarget)}
          project={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onCompleted={() => {
            refreshQueue().catch(() => {})
          }}
        />
      )}
    </div>
  )
}

export default ReviewsPage
