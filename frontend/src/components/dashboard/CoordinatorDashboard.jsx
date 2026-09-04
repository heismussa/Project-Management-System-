import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Row, Statistic, Table, Tag, message } from 'antd'
import api from '../../lib/axios'
import { storeProjectId, unwrapList } from '../../lib/apiHelpers'
import CoordinatorRecommendationModal from '../reviews/CoordinatorRecommendationModal'
import { DASHBOARD_CARD_STYLE } from './chartConstants'

const ACTION_BTN_STYLE = { backgroundColor: '#800000', borderColor: '#800000' }

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
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
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
              width: 110,
              align: 'center',
              render: (_, record) => (
                <Button type="primary" style={ACTION_BTN_STYLE} onClick={() => open(record)}>
                  View
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <CoordinatorRecommendationModal
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
