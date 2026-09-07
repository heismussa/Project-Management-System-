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
  const extra = typeof window === 'undefined' ? [] : getExtraActivities()
  if (category === 'System') return [...SYSTEM_ACTIVITIES, ...extra]
  if (category === 'Infrastructure') return [...INFRASTRUCTURE_ACTIVITIES, ...extra]
  if (category === 'Security') return [...SECURITY_ACTIVITIES, ...extra]
  return [...PROJECT_ACTIVITIES, ...extra]
}

export const TEAM_TYPES = ['Internal', 'Vendor', 'Mixed']

export const REVIEW_TRACKS = [
  { value: 'SDMM', label: 'SDMM — Coordinator recommendation' },
  { value: 'IDMM', label: 'IDMM — Coordinator recommendation' },
  { value: 'DICT', label: 'DICT — Approver execution sign-off' },
]

export const DEFAULT_ANNUAL_PLAN_REFERENCES = [
  'NSSF-2026-APR-001',
  'NSSF-2026-APR-002',
  'NSSF-2026-APR-003',
  'NSSF-2026-APR-004',
]

const APR_STORAGE_KEY = 'pms-annual-plan-items'
const ACTIVITY_STORAGE_KEY = 'pms-activity-catalog'

export function getStoredList(key, fallback = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean) : fallback
  } catch {
    return fallback
  }
}

export function setStoredList(key, values) {
  localStorage.setItem(key, JSON.stringify(values))
}

export function getAnnualPlanReferences() {
  return [...new Set([...DEFAULT_ANNUAL_PLAN_REFERENCES, ...getStoredList(APR_STORAGE_KEY)])]
}

export function saveAnnualPlanReferences(values) {
  setStoredList(APR_STORAGE_KEY, values)
}

export function getExtraActivities() {
  return getStoredList(ACTIVITY_STORAGE_KEY)
}

export function saveExtraActivities(values) {
  setStoredList(ACTIVITY_STORAGE_KEY, values)
}

export function optionsFrom(list) {
  return list.map((value) => (typeof value === 'string' ? { value, label: value } : value))
}
