import { Button, Input, Modal, Select } from 'antd'

/**
 * Reviewer's "Return to planner" popup on the Projects page — purely
 * presentational; ProjectsPage.jsx owns the completed-activity/requirement
 * lists (loaded when the popup opens) and the return request itself.
 */
function ClosureReturnModal({
  open,
  saving,
  itemsLoading,
  comment,
  onCommentChange,
  completedActivities,
  completedRequirements,
  activityIds,
  onActivityIdsChange,
  requirementIds,
  onRequirementIdsChange,
  onSubmit,
  onCancel,
}) {
  return (
    <Modal
      title="Return to planner"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="primary" loading={saving} onClick={onSubmit}>
            Return to planner
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-gray-600">
        Clears the closure request and sends the project back to the Planner. Pick any completed activities or
        requirements that actually need rework — selecting one reopens it (clears its actual end date, and its
        test result if it's a requirement) so the Planner can update and redo it.
      </p>

      <div className="mb-3">
        <div className="mb-1 text-sm font-medium">Activities to reopen</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder={completedActivities.length ? 'Select activities that need rework' : 'No completed activities'}
          loading={itemsLoading}
          value={activityIds}
          onChange={onActivityIdsChange}
          options={completedActivities.map((item) => ({ value: item.id, label: item.name }))}
        />
      </div>

      <div className="mb-3">
        <div className="mb-1 text-sm font-medium">Requirements to reopen</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder={
            completedRequirements.length ? 'Select requirements that need rework' : 'No completed requirements'
          }
          loading={itemsLoading}
          value={requirementIds}
          onChange={onRequirementIdsChange}
          options={completedRequirements.map((item) => ({
            value: item.id,
            label: `${item.requirement_code} — ${item.description}`,
          }))}
        />
      </div>

      <div className="mb-1 text-sm font-medium">Comment</div>
      <Input.TextArea
        rows={3}
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="What still needs to be fixed before this can close?"
      />
    </Modal>
  )
}

export default ClosureReturnModal
