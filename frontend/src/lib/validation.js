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

