import api from '../lib/axios'

// Person 3 (Planner) API layer. Every call the Planner/Reviewer UI makes
// against these 5 endpoints goes through this file and the shared axios
// client — nothing outside here calls these routes directly.

// POST /api/projects/{id}/plan/submit
export function submitPlanForReview(projectId) {
  return api.post(`/projects/${projectId}/plan/submit`)
}

// PATCH /api/requirements/{id}/review
export function reviewRequirement(requirementId, { review_decision }) {
  return api.patch(`/requirements/${requirementId}/review`, { review_decision })
}

// POST /api/projects/{id}/matrix/return
export function returnMatrix(projectId, { comment }) {
  return api.post(`/projects/${projectId}/matrix/return`, { comment })
}

// GET /api/projects/{id}/progress
export function getProjectProgress(projectId) {
  return api.get(`/projects/${projectId}/progress`)
}

// PUT /api/activities/{id}
export function updateActivity(activityId, payload) {
  return api.put(`/activities/${activityId}`, payload)
}
