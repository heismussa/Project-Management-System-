import { Alert } from 'antd'

function WorkflowBar({ projectId, workflow }) {
  if (!projectId || !workflow) return null

  if (!workflow.plan_review_comment && !workflow.plan_pending_reapproval) return null

  return (
    <div className="space-y-3">
      {workflow.plan_review_comment && (
        <Alert type="warning" showIcon message="Reviewer comment" description={workflow.plan_review_comment} />
      )}

      {workflow.plan_pending_reapproval && (
        <Alert
          type="info"
          showIcon
          message="Edits after return are pending re-approval"
          description="Recent activity edits are awaiting the reviewer's re-approval."
        />
      )}
    </div>
  )
}

export default WorkflowBar
