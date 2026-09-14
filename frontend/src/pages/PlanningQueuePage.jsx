import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Table, Tag, message } from 'antd'
import { fetchProjectsCached } from '../lib/projectsCache'
import { storeProjectId, unwrapList } from '../lib/apiHelpers'

function planningReason(project) {
  return project.plan_review_status === 'changes_requested' ? 'Plan returned for changes' : 'Plan not yet submitted'
}

/**
 * The Planner's own action queue — projects assigned to them that need a
 * plan created or fixed right now (GET /projects?scope=planner_pending),
 * each opening straight into that project's Implementation Plan workspace.
 */
function PlanningQueuePage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchProjectsCached({ scope: 'planner_pending' })
      .then((response) => setRows(unwrapList(response.data)))
      .catch((err) => message.error(err.response?.data?.message || 'Could not load your planning queue.'))
      .finally(() => setLoading(false))
  }, [])

  const openPlan = (projectId) => {
    storeProjectId(projectId)
    navigate(`/projects/${projectId}?tab=plan`)
  }

  return (
    <div>
      <Card className="page-shell-card" style={{ marginTop: 0 }}>
        <Table
          className="pms-house-table"
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          dataSource={rows}
          locale={{ emptyText: "Nothing needs a plan right now — you're caught up." }}
          columns={[
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
            {
              title: 'Project Name',
              dataIndex: 'name',
            },
            {
              title: 'Category',
              dataIndex: 'category',
              render: (value) => value || '—',
            },
            {
              title: "What's needed",
              key: 'whats_needed',
              render: (_, record) => <Tag color="gold">{planningReason(record)}</Tag>,
            },
            {
              title: 'Action',
              width: 130,
              align: 'center',
              render: (_, record) => (
                <Button
                  type="primary"
                  style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                  onClick={() => openPlan(record.id)}
                >
                  Plan
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default PlanningQueuePage
