import dayjs from 'dayjs'

// Factories: pass the reference date the picker should be constrained
// against, get back an AntD DatePicker `disabledDate` callback.

// `projectEnd` is optional so callers without a project planned_end_date on
// hand (or a project that never set one) still get the existing behavior.
export function disabledActualStartDate(planned_start_date, projectEnd = null) {
  return (current) => {
    if (!current) return false
    if (planned_start_date && current.isBefore(dayjs(planned_start_date), 'day')) return true
    if (projectEnd && current.isAfter(dayjs(projectEnd), 'day')) return true
    return current.isAfter(dayjs(), 'day')
  }
}

export function disabledActualEndDate(actual_start_date, projectEnd = null) {
  return (current) => {
    if (!current) return false
    if (actual_start_date && current.isBefore(dayjs(actual_start_date), 'day')) return true
    if (projectEnd && current.isAfter(dayjs(projectEnd), 'day')) return true
    return current.isAfter(dayjs(), 'day')
  }
}

// RangePicker `disabledDate`: once the first date of the pair is picked,
// dates before it are disabled while picking the second one.
export function disabledRangeBeforeStart(current, info) {
  if (!current || !info?.from) return false
  return current.isBefore(info.from, 'day')
}

// Same "second date can't be before the first" rule as above, plus keeping
// both ends of the range inside the project's own planned start/end (when
// the project has one) — used for an activity's planned start/end.
export function disabledActivityPlannedRange(projectStart, projectEnd) {
  return (current, info) => {
    if (!current) return false
    if (projectStart && current.isBefore(dayjs(projectStart), 'day')) return true
    if (projectEnd && current.isAfter(dayjs(projectEnd), 'day')) return true
    if (info?.from && current.isBefore(info.from, 'day')) return true
    return false
  }
}

