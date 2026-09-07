import api from '../lib/axios'

// SRS Requirements Matrix API layer (Person 3 / Planner). This used to be
// mock-backed while the endpoints didn't exist yet; they're real now (see
// RequirementController), so every function here just calls the shared
// axios client. Nothing outside this file changed when it was swapped —
// that was the point of routing everything through here from the start.

// GET /projects/{id}/requirements
export function getRequirements(projectId) {
  return api.get(`/projects/${projectId}/requirements`)
}

// GET /requirements/{id}/history — the append-only progress_updates log.
export function getRequirementHistory(requirementId) {
  return api.get(`/requirements/${requirementId}/history`)
}

// POST /projects/{id}/requirements — bulk add. Every row starts pending.
export function bulkCreateRequirements(projectId, rows) {
  return api.post(`/projects/${projectId}/requirements`, { requirements: rows })
}

// PATCH /requirements/{id} — actual dates + remark. implementation_status
// is derived server-side; it is never sent from here.
export function updateRequirementProgress(id, { actual_start_date, actual_end_date, remark }) {
  return api.patch(`/requirements/${id}`, { actual_start_date, actual_end_date, remark })
}

// PATCH /requirements/{id}/review — FAT/SAT/UAT test result + comments.
export function updateRequirementTestScore(id, { test_result, test_comments }) {
  return api.patch(`/requirements/${id}/review`, { test_result, test_comments })
}

// PATCH /requirements/{id}/review — reviewer's per-row approve/reject.
export function reviewRequirement(id, { review_decision }) {
  return api.patch(`/requirements/${id}/review`, { review_decision })
}

// GET /projects/{id}/progress — pending 0% / ongoing 50% / completed 100%,
// computed and persisted server-side.
export function getProjectProgress(projectId) {
  return api.get(`/projects/${projectId}/progress`)
}
