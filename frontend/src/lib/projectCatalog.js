export const PROJECT_CATEGORIES = ['System', 'Infrastructure', 'Security']

export const PROJECT_TYPES = ['New Implementation', 'Review/Enhancement']

export const PROJECT_ACTIVITIES = [
  'Documentation & Planning',
  'System Development',
  'Infrastructure Setup',
  'Security Assessment',
  'User Acceptance Testing',
  'Training & Handover',
  'Go-Live Support',
]

export const TEAM_TYPES = ['Internal', 'Vendor', 'Mixed']

export const REVIEW_TRACKS = [
  { value: 'SDMM', label: 'SDMM — Coordinator recommendation' },
  { value: 'IDMM', label: 'IDMM — Coordinator recommendation' },
  { value: 'DICT', label: 'DICT — Approver execution sign-off' },
]

export function optionsFrom(list) {
  return list.map((value) => (typeof value === 'string' ? { value, label: value } : value))
}
