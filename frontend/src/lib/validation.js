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

// RangePicker `disabledDate`: once the first date of the pair is picked,
// dates before it are disabled while picking the second one.
export function disabledRangeBeforeStart(current, info) {
  if (!current || !info?.from) return false
  return current.isBefore(info.from, 'day')
}

