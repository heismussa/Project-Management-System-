import { Alert } from 'antd'

function WorkflowBar({ projectId, workflow, hideReapprovalNotice = false }) {
  if (!projectId || !workflow) return null

  const showReapprovalNotice = workflow.plan_pending_reapproval && !hideReapprovalNotice
  if (!showReapprovalNotice) return null

  return (
    <div className="space-y-3">
      {showReapprovalNotice && (
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
