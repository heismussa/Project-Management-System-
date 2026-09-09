export const PROJECT_CATEGORIES = ['System', 'Infrastructure', 'Security']

export const PROJECT_TYPES = ['New Implementation', 'Review/Enhancement']

// Category "System" projects are always one of these named NSSF systems,
// so the initial activity list narrows to just these instead of the
// generic phase-style activities used by other categories.
export const SYSTEM_ACTIVITIES = ['CFMS', 'ERP', 'HRMS', 'IPEMS']

// Category "Infrastructure" projects narrow to these infrastructure areas.
export const INFRASTRUCTURE_ACTIVITIES = [
  'Activities Network',
  'Working Tools',
  'Data Center',
  'Server',
  'Database',
]

// Category "Security" projects narrow to these security areas.
export const SECURITY_ACTIVITIES = ['Activities Control', 'Vulnerability']

export const PROJECT_ACTIVITIES = [
  'Documentation & Planning',
  'System Development',
  'Infrastructure Setup',
  'Security Assessment',
  'User Acceptance Testing',
  'Training & Handover',
  'Go-Live Support',
]

export function activitiesForCategory(category) {
  if (category === 'System') return SYSTEM_ACTIVITIES
  if (category === 'Infrastructure') return INFRASTRUCTURE_ACTIVITIES
  if (category === 'Security') return SECURITY_ACTIVITIES
  return PROJECT_ACTIVITIES
}

export const TEAM_TYPES = ['Internal', 'Vendor', 'Mixed']

export const REVIEW_TRACKS = [
  { value: 'SDMM', label: 'SDMM — Coordinator recommendation' },
  { value: 'IDMM', label: 'IDMM — Coordinator recommendation' },
  { value: 'DICT', label: 'DICT — Approver execution sign-off' },
]

export function optionsFrom(list) {
  return list.map((value) => (typeof value === 'string' ? { value, label: value } : value))
}
