import { ROLES, SYSTEM_TITLE } from '../utility/Config.jsx'
import Project from '../utility/menu/project.jsx'

export { ROLES, SYSTEM_TITLE }

export const ALL_ROLES = Object.values(ROLES)
export const ICT_SUPPORT_ROLE = ROLES.IS
export const ADMIN_ROLE = ROLES.PAD

export const ROLE_LABELS = {
  project_reviewer: ROLES.PRV,
  project_planner: ROLES.PPL,
  project_coordinator: ROLES.PCO,
  project_approver: ROLES.PAP,
  project_implementor: ROLES.PIM,
  project_viewonly: 'Viewer',
  [ROLES.PRV]: ROLES.PRV,
  [ROLES.PPL]: ROLES.PPL,
  [ROLES.PCO]: ROLES.PCO,
  [ROLES.PAP]: ROLES.PAP,
  [ROLES.PIM]: ROLES.PIM,
  [ROLES.PVO]: 'Viewer',
  [ROLES.IS]: ROLES.IS,
  [ROLES.PAD]: ROLES.PAD,
}

export function formatRoleLabel(name) {
  if (!name) return 'No role assigned'
  return ROLE_LABELS[name] ?? name
}

export const NAV_ITEMS = Project()
export const ICT_SUPPORT_NAV_ITEMS = NAV_ITEMS.filter((item) => item.url === '/user-management')

const CREATE_CRUMB = { path: '/projects/create', label: 'Create Project' }

export function getAssignedRoles(user) {
  if (!user) return []
  const fromList = (user.roles || [])
    .map((role) => (typeof role === 'string' ? { id: role, name: role } : { id: role?.id, name: role?.name }))
    .filter((role) => role.name)
  if (user.role && !fromList.some((role) => role.name === user.role)) {
    fromList.push({ id: user.role, name: user.role })
  }
  return fromList
}

export function getUserRoleNames(user) {
  return getAssignedRoles(user).map((role) => role.name)
}

export function userHasRole(user, roleName) {
  return getUserRoleNames(user).includes(roleName)
}

export function canManageUsers(user, activeRole = null) {
  const activeName = typeof activeRole === 'string' ? activeRole : activeRole?.name
  if (activeName) {
    return activeName === ICT_SUPPORT_ROLE || activeName === ADMIN_ROLE
  }
  if (!user) return false
  return userHasRole(user, ICT_SUPPORT_ROLE) || userHasRole(user, ADMIN_ROLE)
}

export function canAccessNavItem(item, roleName) {
  if (!item) return false
  const roles = item.roles || []
  if (roles.length === 0) return true
  return Boolean(roleName) && roles.includes(roleName)
}

export function getVisibleNavItems(roleName) {
  return NAV_ITEMS.filter((item) => canAccessNavItem(item, roleName))
}

export function getActiveNavItem(pathname) {
  if (pathname === '/' || pathname === '/home') return NAV_ITEMS[0]
  if (/^\/projects\/\d+/.test(pathname)) {
    return NAV_ITEMS.find((item) => item.url === '/projects') ?? NAV_ITEMS[0]
  }
  const matches = NAV_ITEMS.filter((item) => item.url !== '/' && pathname.startsWith(item.url))
  const sorted = [...matches].sort((a, b) => b.url.length - a.url.length)
  return sorted[0] ?? NAV_ITEMS[0]
}

export function pathAllowedForRole(pathname, roleName) {
  if (pathname.startsWith('/projects/create')) {
    return roleName === ROLES.PRV || roleName === ROLES.PAD
  }
  if (/^\/projects\/\d+/.test(pathname) || pathname === '/projects') {
    return true
  }
  if (
    pathname.startsWith('/implementation-plan') ||
    pathname.startsWith('/traceability-matrix') ||
    pathname.startsWith('/documents')
  ) {
    return true
  }
  if (pathname.startsWith('/reviews')) {
    return [ROLES.PRV, ROLES.PCO, ROLES.PAP, ROLES.PAD].includes(roleName)
  }
  if (pathname.startsWith('/recommendations')) {
    return roleName === ROLES.PCO || roleName === ROLES.PAD
  }
  if (pathname.startsWith('/reports') || pathname.startsWith('/notifications')) {
    // Reviewer sidebar hides these; direct URL still allowed for other roles and bookmarks.
    return true
  }
  if (pathname.startsWith('/settings')) {
    return [ROLES.IS, ROLES.PRV, ROLES.PVO, ROLES.PAD].includes(roleName)
  }
  if (pathname.startsWith('/admin/master-data')) {
    return roleName === ROLES.IS || roleName === ROLES.PAD
  }
  return canAccessNavItem(getActiveNavItem(pathname), roleName)
}

export function formatUserRoles(user, activeRole = null) {
  const activeName = typeof activeRole === 'string' ? activeRole : activeRole?.name
  if (activeName) return formatRoleLabel(activeName)
  const names = getUserRoleNames(user)
  if (!names.length) return 'No role assigned'
  return names.map((name) => formatRoleLabel(name)).join(', ')
}

export function getBreadcrumbCrumbs(pathname, projectName) {
  const active = getActiveNavItem(pathname)
  const isIctSupport = ICT_SUPPORT_NAV_ITEMS.some((item) => item.url === active.url)

  if (isIctSupport) {
    return [
      { label: 'ICT Support', current: false },
      { label: active.label, link: active.url, current: true },
    ]
  }

  const crumbs = [
    { label: active.label, link: active.url, current: pathname === active.url || pathname === '/home' },
  ]

  if (pathname.startsWith('/projects/create')) {
    crumbs[0].current = false
    crumbs.push({ label: CREATE_CRUMB.label, link: CREATE_CRUMB.path, current: true })
  }

  if (/^\/projects\/\d+/.test(pathname)) {
    crumbs[0].current = false
    crumbs.push({ label: 'Project', link: '/projects', current: false })
    crumbs.push({ label: projectName || 'Project', current: true })
  }

  return crumbs
}

export function formatRole(role) {
  if (!role) return 'Not signed in'
  return ROLE_LABELS[role] ?? role
}
