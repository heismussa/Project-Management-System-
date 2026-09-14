import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Table, Tag, message } from 'antd'
import ReviewWorkspaceDrawer, { ReviewWorkspacePanel } from '../components/reviews/ReviewWorkspaceDrawer'
import CoordinatorRecommendationModal from '../components/reviews/CoordinatorRecommendationModal'
import ApproverSignOffModal from '../components/reviews/ApproverSignOffModal'
import { fetchProjectsCached } from '../lib/projectsCache'
import { getStoredProjectId, storeProjectId, unwrapList } from '../lib/apiHelpers'
import { useActiveRoleName } from '../components/common/RoleGuard'
import { ROLES } from '../utility/Config.jsx'
import { QUEUE_LABELS } from '../lib/queueLabels'

const REVIEW_BTN_STYLE = { backgroundColor: '#800000', borderColor: '#800000' }

function ReviewsPage({ embedded = false, queueFilter = null } = {}) {
  const { id: routeId } = useParams()
  const roleName = useActiveRoleName()
  const isApprover = roleName === ROLES.PAP
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [reviewTarget, setReviewTarget] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
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

  // Embedded mode (a single project's review panel) wants the plain,
  // unscoped list to resolve this one project's name.
  useEffect(() => {
    if (!embedded) return
    fetchProjectsCached()
      .then((response) => {
        const list = unwrapList(response.data)
        setProjects(list)
        setProjectId((current) => {
          if (current && list.some((project) => project.id === current)) return current
          const first = list[0]?.id ?? null
          storeProjectId(first)
          return first
        })
      })
      .catch((err) => message.error(err.response?.data?.message || 'Could not load queue.'))
  }, [embedded])

  // Coordinator's page (queueFilter='recommendation'), Approver's
  // (queueFilter=null, isApprover), and Reviewer's (queueFilter=[plan_review,
  // closure_sign_off]) each map to their own server-side scope — GET
  // /projects?scope=<x>_pending — so only the rows this role can act on
  // ever cross the wire, not the whole portfolio filtered client-side.
  const scopePrefix = queueFilter === 'recommendation' ? 'coordinator' : isApprover ? 'approver' : 'reviewer'

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchProjectsCached({ scope: `${scopePrefix}_pending` })
      const list = unwrapList(response.data).map((project) => ({ ...project, queue: project.workflow?.queue }))
      setRows(list)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load queue.')
    } finally {
      setLoading(false)
    }
  }, [scopePrefix])

  useEffect(() => {
    if (embedded) return
    loadQueue()
  }, [embedded, loadQueue])

  const refreshQueue = useCallback(async () => {
    if (embedded) {
      const list = unwrapList((await fetchProjectsCached()).data)
      setProjects(list)
      return
    }
    await loadQueue()
  }, [embedded, loadQueue])

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
      <Card className="page-shell-card" style={{ marginTop: 0 }}>
        <Table
          className="pms-house-table"
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          dataSource={rows}
          locale={{ emptyText: 'Nothing in this queue.' }}
          columns={[
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
            {
              title: 'Project Name',
              dataIndex: 'name',
            },
            {
              title: 'Queue',
              dataIndex: 'queue',
              render: (value) => <Tag>{QUEUE_LABELS[value] || value}</Tag>,
            },
            {
              title: 'Planner',
              key: 'planner',
              render: (_, record) => record.planner?.name || '—',
            },
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
      ) : isApprover && reviewTarget?.queue === 'execution_sign_off' ? (
        <ApproverSignOffModal
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
