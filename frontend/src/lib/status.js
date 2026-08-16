export const STATUS = {
  not_started: { label: 'Not Started', color: 'default', score: 0 },
  pending: { label: 'Pending', color: 'default', score: 0 },
  ongoing: { label: 'Ongoing', color: '#ffc20a', score: 50 },
  completed: { label: 'Completed', color: '#068737', score: 100 },
}

// no actual start -> not_started, an actual start with no actual end ->
// ongoing, both dates present -> completed. `pending` is not date-derived;
// it's a distinct manually-set state (e.g. a requirement not yet started).
export function deriveStatus({ actual_start_date, actual_end_date }) {
  if (!actual_start_date) return 'not_started'
  if (!actual_end_date) return 'ongoing'
  return 'completed'
}

export function calcScore(items) {
  if (!items.length) return 0
  const total = items.reduce((sum, item) => sum + STATUS[item.implementation_status].score, 0)
  return total / items.length
}
