import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, message } from 'antd'
import api from '../../lib/axios'
import { storeProjectId, unwrapList } from '../../lib/apiHelpers'
import ReviewWorkspaceDrawer from '../reviews/ReviewWorkspaceDrawer'
import { DASHBOARD_CARD_STYLE } from './chartConstants'

export default function CoordinatorDashboard() {
  const [projects, setProjects] = useState([])
  const [reviewTarget, setReviewTarget] = useState(null)

  const refresh = () =>
    api
      .get('/projects')
      .then((response) => setProjects(unwrapList(response.data)))
      .catch(() => message.error('Could not load projects.'))

  useEffect(() => {
    refresh()
  }, [])

  const inbox = useMemo(
    () => projects.filter((project) => project.workflow?.queue === 'recommendation'),
    [projects],
  )
  const byTrack = useMemo(() => {
    return inbox.reduce((acc, project) => {
      const track = project.workflow?.review_track || project.review_track || 'SDMM'
      acc[track] = (acc[track] || 0) + 1
      return acc
    }, {})
  }, [inbox])

  const open = (project) => {
    storeProjectId(project.id)
    setReviewTarget(project)
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="page-shell-card" style={DASHBOARD_CARD_STYLE}>
            <Statistic title="Awaiting recommendation" value={inbox.length} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="page-shell-card" style={DASHBOARD_CARD_STYLE}>
            <Statistic title="SDMM" value={byTrack.SDMM || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="page-shell-card" style={DASHBOARD_CARD_STYLE}>
            <Statistic title="IDMM" value={byTrack.IDMM || 0} />
          </Card>
        </Col>
      </Row>

      <Card className="page-shell-card mt-4" title="Recommendations inbox">
        <Table
          className="pms-house-table"
          rowKey="id"
          dataSource={inbox}
          locale={{ emptyText: 'No projects waiting for recommendation.' }}
          columns={[
            { title: 'Project', dataIndex: 'name' },
            {
              title: 'Track',
              render: (_, record) => (
                <Tag color="blue">{record.workflow?.review_track || record.review_track}</Tag>
              ),
            },
            { title: 'Planner', render: (_, record) => record.planner?.name || '—' },
            {
              title: 'Action',
              render: (_, record) => (
                <button type="button" className="text-[#650018] underline" onClick={() => open(record)}>
                  Recommend
                </button>
              ),
            },
          ]}
        />
      </Card>

      <ReviewWorkspaceDrawer
        open={Boolean(reviewTarget)}
        project={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onCompleted={() => {
          refresh()
        }}
      />
    </div>
  )
}
