// Single source of truth for turning a project's backend queue code (see
// ProjectWorkflowService::queueName()) into the label shown in the UI.
// Previously each page that displayed a Queue column kept its own copy —
// ReviewsPage's only covered the queues it actionably lists, so a page like
// Reports that shows every project ended up printing raw codes like
// "in_execution" for the ones outside that set instead of a real label.
export const QUEUE_LABELS = {
  planning: 'Planning',
  plan_review: 'Plan review',
  recommendation: 'Recommendation',
  execution_sign_off: 'Execution sign-off',
  in_execution: 'In execution',
  closure_sign_off: 'Closure sign-off',
  closed: 'Closed',
}
