import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd'
import dayjs from 'dayjs'
import ProjectPicker from '../components/common/ProjectPicker'
import ReviewStatusBadge from '../components/common/ReviewStatusBadge'
import RoleGuard, { useActiveRoleName } from '../components/common/RoleGuard'
import api from '../lib/axios'
import { getStoredProjectId, storeProjectId, unwrapList } from '../lib/apiHelpers'
import { ROLES } from '../utility/Config.jsx'
import { useAuth } from '../context/AuthContext'

function hasPermission(user, code) {
  return (user?.permissions || []).includes(code)
}

function ReviewsPage() {
  const { user } = useAuth()
  const roleName = useActiveRoleName()
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(getStoredProjectId)
  const [workflow, setWorkflow] = useState(null)
  const [documents, setDocuments] = useState([])
  const [activities, setActivities] = useState([])
  const [reviews, setReviews] = useState([])
  const [closure, setClosure] = useState(null)
  const [commentForm] = Form.useForm()
  const [modal, setModal] = useState(null)
  const [docTarget, setDocTarget] = useState(null)

  const load = useCallback(async (id) => {
    if (!id) return
    const [workflowRes, docsRes, activitiesRes, reviewsRes, closureRes] = await Promise.all([
      api.get(`/projects/${id}/workflow`),
      api.get(`/projects/${id}/documents`).catch(() => ({ data: { data: [] } })),
      api.get(`/projects/${id}/activities`).catch(() => ({ data: { data: [] } })),
      api.get(`/projects/${id}/reviews`),
      api.get(`/projects/${id}/closure-readiness`).catch(() => ({ data: { data: null } })),
    ])
    setWorkflow(workflowRes.data?.data)
    setDocuments(unwrapList(docsRes.data))
    setActivities(unwrapList(activitiesRes.data))
    setReviews(unwrapList(reviewsRes.data))
    setClosure(closureRes.data?.data || null)
  }, [])

  useEffect(() => {
    api.get('/projects').then((response) => {
      const list = unwrapList(response.data)
      setProjects(list)
      setProjectId((current) => {
        if (current && list.some((project) => project.id === current)) return current
        const first = list[0]?.id ?? null
        storeProjectId(first)
        return first
      })
    })
  }, [])

  useEffect(() => {
    load(projectId).catch((err) => message.error(err.response?.data?.message || 'Could not load reviews'))
  }, [projectId, load])

  const pendingDocs = documents.filter((doc) => doc.review_status === 'pending' || doc.review_status === 'returned')
  const pendingChanges = activities.filter((activity) => activity.plan_change_status === 'pending')
  const pendingProgress = activities.filter((activity) => activity.progress_review_status === 'pending')
  const blockers = workflow?.execution_blockers || []
  const checks = closure?.checks || workflow?.closure?.checks || []

  const queueProjects = useMemo(() => {
    return {
      plan: projects.filter((project) => project.workflow?.queue === 'plan_review' || project.plan_review_status === 'pending_review'),
      recommend: projects.filter((project) => project.workflow?.queue === 'recommendation'),
      signOff: projects.filter((project) => project.workflow?.queue === 'execution_sign_off'),
    }
  }, [projects])

  const runAction = async (path, payload = {}, success) => {
    try {
      const response = await api.post(path, payload)
      message.success(success || response.data.message)
      setModal(null)
      setDocTarget(null)
      commentForm.resetFields()
      const list = unwrapList((await api.get('/projects')).data)
      setProjects(list)
      await load(projectId)
    } catch (err) {
      const closeErrors = err.response?.data?.errors?.close
      const executionErrors = err.response?.data?.errors?.execution || err.response?.data?.errors?.recommend
      message.error(
        (Array.isArray(closeErrors) && closeErrors[0]) ||
          (Array.isArray(executionErrors) && executionErrors[0]) ||
          err.response?.data?.message ||
          'Action failed',
      )
    }
  }

  const submitCommentModal = () => {
    commentForm.validateFields().then((values) => {
      if (modal === 'return') {
        runAction(`/projects/${projectId}/plan/review`, { decision: 'returned', comment: values.comment })
      } else if (modal === 'recommend') {
        runAction(`/projects/${projectId}/recommend`, { comment: values.comment }, 'Coordinator recommendation recorded')
      } else if (modal === 'signoff') {
        runAction(`/projects/${projectId}/approve-execution`, { comment: values.comment }, 'DICT execution sign-off recorded')
      } else if (modal === 'close') {
        runAction(`/projects/${projectId}/close`, { comment: values.comment }, 'Project closed')
      } else if (modal === 'doc' && docTarget) {
        runAction(`/documents/${docTarget.id}/review`, {
          decision: values.decision,
          comment: values.comment,
        })
      }
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#650018' }}>
            Reviews
          </h2>
          <p className="text-sm text-gray-500">
            Plan approval, SDMM/IDMM recommendation, DICT execution sign-off, and closure.
          </p>
        </div>
        <ProjectPicker
          projects={projects}
          value={projectId}
          onChange={(id) => {
            storeProjectId(id)
            setProjectId(id)
          }}
        />
      </div>

      {workflow && (
        <Space wrap className="mb-4">
          <Tag>Queue: {(workflow.queue || 'planning').replaceAll('_', ' ')}</Tag>
          <Tag color="blue">Track: {workflow.review_track}</Tag>
          <Tag>Plan: {(workflow.plan_review_status || 'draft').replaceAll('_', ' ')}</Tag>
          <Tag>Phase: {workflow.phase || '—'}</Tag>
        </Space>
      )}

      {roleName === ROLES.PCO && (
        <Alert className="mb-4" type="info" showIcon message={`${queueProjects.recommend.length} project(s) awaiting SDMM/IDMM recommendation.`} />
      )}
      {roleName === ROLES.PAP && (
        <Alert className="mb-4" type="info" showIcon message={`${queueProjects.signOff.length} project(s) awaiting DICT execution sign-off.`} />
      )}

      <Tabs
        items={[
          {
            key: 'plan',
            label: `Plan (${queueProjects.plan.length})`,
            children: (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Reviewer approves or returns the implementation plan. A return comment is mandatory.
                </p>
                <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
                  <Space>
                    <Button
                      type="primary"
                      disabled={!workflow?.can_review_plan}
                      onClick={() => runAction(`/projects/${projectId}/plan/review`, { decision: 'approved' })}
                    >
                      Approve plan
                    </Button>
                    <Button disabled={!workflow?.can_review_plan} onClick={() => setModal('return')}>
                      Return with comments
                    </Button>
                  </Space>
                </RoleGuard>
                {workflow?.plan_review_comment && (
                  <Alert type="warning" showIcon message="Latest return comment" description={workflow.plan_review_comment} />
                )}
              </div>
            ),
          },
          {
            key: 'recommend',
            label: `Recommend (${queueProjects.recommend.length})`,
            children: (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Coordinator recommends SDMM/IDMM projects after the plan is approved. Open Matrix and Documents in
                  read-only mode before recommending.
                </p>
                <RoleGuard allow={[ROLES.PCO, ROLES.PAD]}>
                  <Button
                    type="primary"
                    disabled={!hasPermission(user, 'projects.recommend') || !workflow?.can_recommend}
                    onClick={() => setModal('recommend')}
                  >
                    Recommend execution
                  </Button>
                </RoleGuard>
              </div>
            ),
          },
          {
            key: 'signoff',
            label: `DICT sign-off (${queueProjects.signOff.length})`,
            children: (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Approver records DICT execution sign-off. Execution stays blocked until plan, documents, and activity
                  evidence pass the gates below.
                </p>
                <RoleGuard allow={[ROLES.PAP, ROLES.PAD]}>
                  <Button
                    type="primary"
                    disabled={!hasPermission(user, 'projects.approve') || !workflow?.can_sign_off_execution}
                    onClick={() => setModal('signoff')}
                  >
                    Sign off execution
                  </Button>
                </RoleGuard>
              </div>
            ),
          },
          {
            key: 'blockers',
            label: `Blockers (${blockers.length})`,
            children: blockers.length ? (
              <Alert
                type="warning"
                showIcon
                message="Execution gates"
                description={
                  <ul className="mb-0 list-disc pl-5">
                    {blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                }
              />
            ) : (
              <Alert type="success" showIcon message="No execution blockers on this project." />
            ),
          },
          {
            key: 'documents',
            label: `Documents (${pendingDocs.length})`,
            children: (
              <Table
                rowKey="id"
                pagination={false}
                dataSource={pendingDocs}
                columns={[
                  { title: 'File', dataIndex: 'file_name' },
                  { title: 'Type', dataIndex: 'document_type' },
                  {
                    title: 'Status',
                    dataIndex: 'review_status',
                    render: (value) => <ReviewStatusBadge status={value} />,
                  },
                  { title: 'Comment', dataIndex: 'review_comment', render: (value) => value || '—' },
                  {
                    title: 'Action',
                    render: (_, record) => (
                      <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
                        <Button
                          size="small"
                          onClick={() => {
                            setDocTarget(record)
                            setModal('doc')
                          }}
                        >
                          Review
                        </Button>
                      </RoleGuard>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'plan-changes',
            label: `Plan changes (${pendingChanges.length})`,
            children: (
              <Table
                rowKey="id"
                pagination={false}
                dataSource={pendingChanges}
                columns={[
                  { title: 'Activity', dataIndex: 'name' },
                  {
                    title: 'Proposed change',
                    render: (_, record) => JSON.stringify(record.pending_changes || {}),
                  },
                  {
                    title: 'Action',
                    render: (_, record) => (
                      <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => runAction(`/activities/${record.id}/plan-changes/approve`)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() =>
                              runAction(`/activities/${record.id}/plan-changes/reject`, { comment: 'Rejected' })
                            }
                          >
                            Reject
                          </Button>
                        </Space>
                      </RoleGuard>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'progress',
            label: `Progress updates (${pendingProgress.length})`,
            children: (
              <Table
                rowKey="id"
                pagination={false}
                dataSource={pendingProgress}
                columns={[
                  { title: 'Activity', dataIndex: 'name' },
                  {
                    title: 'Actual Start',
                    dataIndex: 'actual_start_date',
                    render: (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—'),
                  },
                  {
                    title: 'Actual End',
                    dataIndex: 'actual_end_date',
                    render: (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—'),
                  },
                  {
                    title: 'Action',
                    render: (_, record) => (
                      <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => runAction(`/activities/${record.id}/progress-review/approve`)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() =>
                              runAction(`/activities/${record.id}/progress-review/reject`, { comment: 'Rejected' })
                            }
                          >
                            Reject
                          </Button>
                        </Space>
                      </RoleGuard>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'closure',
            label: closure?.ready ? 'Closure (ready)' : 'Closure',
            children: (
              <div className="space-y-3">
                <Table
                  rowKey="key"
                  pagination={false}
                  dataSource={checks}
                  columns={[
                    { title: 'Gate', dataIndex: 'label' },
                    {
                      title: 'Result',
                      dataIndex: 'passed',
                      render: (passed) => <Tag color={passed ? 'green' : 'red'}>{passed ? 'Passed' : 'Blocked'}</Tag>,
                    },
                  ]}
                />
                <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
                  <Button type="primary" danger disabled={!closure?.ready} onClick={() => setModal('close')}>
                    Close project
                  </Button>
                </RoleGuard>
              </div>
            ),
          },
          {
            key: 'history',
            label: `History (${reviews.length})`,
            children: (
              <Table
                rowKey="id"
                pagination={false}
                dataSource={reviews}
                columns={[
                  { title: 'Type', dataIndex: 'entity_type' },
                  { title: 'Decision', dataIndex: 'decision', render: (value) => <Tag>{value}</Tag> },
                  { title: 'Role', dataIndex: 'role_snapshot', render: (value) => value || '—' },
                  { title: 'Comment', dataIndex: 'comment', render: (value) => value || '—' },
                  { title: 'Reviewer', render: (_, record) => record.reviewer?.name || '—' },
                  {
                    title: 'When',
                    dataIndex: 'reviewed_at',
                    render: (value) => (value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—'),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <Modal
        title={
          {
            return: 'Return plan with comments',
            recommend: 'Coordinator recommendation (SDMM/IDMM)',
            signoff: 'DICT execution sign-off',
            close: 'Close project',
            doc: 'Review document',
          }[modal] || 'Comment'
        }
        open={modal !== null}
        onOk={submitCommentModal}
        onCancel={() => {
          setModal(null)
          setDocTarget(null)
          commentForm.resetFields()
        }}
      >
        <Form form={commentForm} layout="vertical" initialValues={{ decision: 'approved' }}>
          {modal === 'doc' && (
            <Form.Item name="decision" label="Decision" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'approved', label: 'Approve' },
                  { value: 'returned', label: 'Return with comments' },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            name="comment"
            label="Comment"
            rules={modal === 'return' ? [{ required: true, message: 'A return comment is required' }] : []}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ReviewsPage
