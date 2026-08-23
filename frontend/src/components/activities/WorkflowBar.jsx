import { Alert, Space, Tag } from 'antd'

const STATUS_COLOR = {
  draft: 'default',
  pending_review: 'gold',
  approved: 'green',
  changes_requested: 'orange',
}

function WorkflowBar({ projectId, workflow }) {
  if (!projectId || !workflow) return null

  const forwardRole = workflow.forward_target?.role_name || 'Coordinator / Approver'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--pms-border)] bg-[var(--pms-bg-container)] p-4">
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
    </div>
  )
}

export default WorkflowBar
