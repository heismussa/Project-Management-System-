export const ACTIVITY_STATUS = {
  NOT_STARTED: 'Not Started',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
}

export const STATUS_BADGE = {
  [ACTIVITY_STATUS.NOT_STARTED]: 'default',
  [ACTIVITY_STATUS.ONGOING]: 'processing',
  [ACTIVITY_STATUS.COMPLETED]: 'success',
}

// Status is derived, never stored: no actual start -> Not Started, an actual
// start with no actual end -> Ongoing, both dates present -> Completed.
export function deriveStatus(actualStart, actualEnd) {
  if (!actualStart) return ACTIVITY_STATUS.NOT_STARTED
  if (!actualEnd) return ACTIVITY_STATUS.ONGOING
  return ACTIVITY_STATUS.COMPLETED
}
