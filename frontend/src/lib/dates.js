import dayjs from 'dayjs'

export function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '—'
}
