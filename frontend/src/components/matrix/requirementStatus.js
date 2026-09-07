import { deriveStatus } from '../../lib/status'

export function getLatestProgressUpdate(requirementId, progressUpdates) {
  return [...progressUpdates]
    .filter((update) => update.entity_type === 'requirement' && update.entity_id === requirementId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

// The requirement table has no actual_start_date/actual_end_date of its
// own — those live on its progress_update log entries. A requirement with
// no history yet is `pending`; once logged, status derives from the most
// recent entry's dates, same rule as activities.
export function getRequirementStatus(requirementId, progressUpdates) {
  const latest = getLatestProgressUpdate(requirementId, progressUpdates)
  if (!latest) return 'pending'
  return deriveStatus(latest)
}
