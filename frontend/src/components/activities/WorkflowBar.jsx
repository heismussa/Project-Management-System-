import { Alert, Button, Space, Tag, message } from 'antd'
import RoleGuard from '../common/RoleGuard'
import { ROLES } from '../../utility/Config.jsx'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'

const STATUS_COLOR = {
  draft: 'default',
  pending_review: 'gold',
  approved: 'green',
  changes_requested: 'orange',
}

function WorkflowBar({ projectId, workflow, onUpdated }) {
  if (!projectId || !workflow) return null

  const blockers = workflow.execution_blockers || []
  const forwardRole = workflow.forward_target?.role_name || 'Coordinator / Approver'

  const submitPlan = async () => {
    try {
      const response = await api.post(`/projects/${projectId}/plan/submit`)
      message.success(response.data?.message || 'Plan submitted')
      onUpdated?.(response.data?.workflow || unwrapItem(response.data))
    } catch (err) {
      message.error(err.response?.data?.message || err.response?.data?.errors?.plan?.[0] || 'Could not submit plan')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <Space wrap>
          <Tag color={STATUS_COLOR[workflow.plan_review_status] || 'default'}>
            Plan: {(workflow.plan_review_status || 'draft').replaceAll('_', ' ')}
          </Tag>
          <Tag>{workflow.phase || 'Registration'}</Tag>
          <Tag color="blue">
            Track {workflow.review_track || 'SDMM'} → {forwardRole}
          </Tag>
          {workflow.execution_started_at && <Tag color="green">In execution</Tag>}
          {workflow.closed_at && <Tag color="red">Closed</Tag>}
        </Space>
        <RoleGuard allow={[ROLES.PPL, ROLES.PAD]}>
          <Button
            disabled={workflow.plan_review_status === 'pending_review' || Boolean(workflow.closed_at)}
            onClick={submitPlan}
          >
            Submit plan for review
          </Button>
        </RoleGuard>
      </div>

      {workflow.plan_review_comment && (
        <Alert type="warning" showIcon message="Reviewer comment" description={workflow.plan_review_comment} />
      )}

      {workflow.plan_pending_reapproval && (
        <Alert
          type="info"
          showIcon
          message="Edits after return are pending re-approval"
          description="Submit the plan again so the reviewer can approve the latest activities."
        />
      )}

      {blockers.length > 0 && (
        <Alert
          type="error"
          showIcon
          message="Execution is blocked until these are resolved"
          description={
            <ul className="mb-0 list-disc pl-5">
              {blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          }
        />
      )}
    </div>
  )
}

export default WorkflowBar
