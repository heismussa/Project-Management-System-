import dayjs from 'dayjs'

// Factories: pass the reference date the picker should be constrained
// against, get back an AntD DatePicker `disabledDate` callback.

export function disabledActualStartDate(planned_start_date) {
  return (current) => {
    if (!current) return false
    if (planned_start_date && current.isBefore(dayjs(planned_start_date), 'day')) return true
    return current.isAfter(dayjs(), 'day')
  }
}

export function disabledActualEndDate(actual_start_date) {
  return (current) => {
    if (!current) return false
    if (actual_start_date && current.isBefore(dayjs(actual_start_date), 'day')) return true
    return current.isAfter(dayjs(), 'day')
  }
}

export function disabledActualStartWithinPlan(planned_start_date, planned_end_date) {
  return (current) => {
    if (!current) return false
    if (planned_start_date && current.isBefore(dayjs(planned_start_date), 'day')) return true
    if (planned_end_date && current.isAfter(dayjs(planned_end_date), 'day')) return true
    return false
  }
}

export function disabledActualEndWithinPlan(planned_start_date, planned_end_date, actual_start_date) {
  return (current) => {
    if (!current) return false
    const minDate = actual_start_date || planned_start_date
    if (minDate && current.isBefore(dayjs(minDate), 'day')) return true
    if (planned_end_date && current.isAfter(dayjs(planned_end_date), 'day')) return true
    return false
  }
}

export function validateActualDatesWithinPlan({
  actual_start_date,
  actual_end_date,
  planned_start_date,
  planned_end_date,
}) {
  if (!planned_start_date || !planned_end_date) {
    return 'Planned start and end dates are required before updating actual dates.'
  }

  const plannedStart = dayjs(planned_start_date)
  const plannedEnd = dayjs(planned_end_date)

  if (actual_start_date) {
    const actualStart = dayjs(actual_start_date)
    if (actualStart.isBefore(plannedStart, 'day') || actualStart.isAfter(plannedEnd, 'day')) {
      return 'Actual start must fall within the planned start and end dates.'
    }
  }

  if (actual_end_date) {
    const actualEnd = dayjs(actual_end_date)
    if (actualEnd.isBefore(plannedStart, 'day') || actualEnd.isAfter(plannedEnd, 'day')) {
      return 'Actual end must fall within the planned start and end dates.'
    }
  }

  if (actual_start_date && actual_end_date && dayjs(actual_end_date).isBefore(dayjs(actual_start_date), 'day')) {
    return 'Actual end cannot be before actual start.'
  }

  return null
}
