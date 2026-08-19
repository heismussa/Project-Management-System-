import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Network,
  FileText,
  ClipboardCheck,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'

export const SYSTEM_TITLE = 'Project Management System (PMS)'

export const ICT_SUPPORT_ROLE = 'ICT Support'
export const ADMIN_ROLE = 'Project Administrator'

export const ROLE_LABELS = {
  project_reviewer: 'Project Reviewer',
  project_planner: 'Project Planner',
  project_coordinator: 'Project Coordinator',
  project_approver: 'Project Approver',
  project_implementor: 'Project Implementor',
  project_viewonly: 'Viewer',
  'ICT Support': 'ICT Support',
  'Project Administrator': 'Project Administrator',
}

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', Icon: FolderKanban },
  { path: '/implementation-plan', label: 'Implementation Plan', Icon: ClipboardList },
  { path: '/traceability-matrix', label: 'Traceability Matrix', Icon: Network },
  { path: '/documents', label: 'Documents', Icon: FileText },
  { path: '/reviews', label: 'Reviews', Icon: ClipboardCheck },
  { path: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export const ICT_SUPPORT_NAV_ITEMS = [
  { path: '/user-management', label: 'User Management', Icon: Users },
]

const ALL_NAV_ITEMS = [...NAV_ITEMS, ...ICT_SUPPORT_NAV_ITEMS]

const CREATE_CRUMB = { path: '/projects/create', label: 'Create Project' }

export function getUserRoleNames(user) {
  if (!user) return []
  const names = (user.roles || [])
    .map((role) => (typeof role === 'string' ? role : role?.name))
    .filter(Boolean)
  if (user.role && !names.includes(user.role)) names.push(user.role)
  return names
}

export function userHasRole(user, roleName) {
  return getUserRoleNames(user).includes(roleName)
}

export function canManageUsers(user) {
  if (!user) return false
  const permissions = user.permissions || []
  if (permissions.includes('admin.manage_users')) return true
  return userHasRole(user, ICT_SUPPORT_ROLE) || userHasRole(user, ADMIN_ROLE)
}

export function formatUserRoles(user) {
  const names = getUserRoleNames(user)
  if (!names.length) return 'No role assigned'
  return names.map((name) => ROLE_LABELS[name] ?? name).join(', ')
}

export function getActiveNavItem(pathname) {
  if (pathname === '/' || pathname === '/home') return NAV_ITEMS[0]
  const matches = ALL_NAV_ITEMS.filter((item) => item.path !== '/' && pathname.startsWith(item.path))
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? NAV_ITEMS[0]
}

export function getBreadcrumbCrumbs(pathname) {
  const active = getActiveNavItem(pathname)
  const isIctSupport = ICT_SUPPORT_NAV_ITEMS.some((item) => item.path === active.path)

  if (isIctSupport) {
    return [
      { label: 'ICT Support', current: false },
      { label: active.label, link: active.path, current: true },
    ]
  }

  const crumbs = [{ label: active.label, link: active.path, current: pathname === active.path || pathname === '/home' }]

  if (pathname.startsWith('/projects/create')) {
    crumbs[0].current = false
    crumbs.push({ label: CREATE_CRUMB.label, link: CREATE_CRUMB.path, current: true })
  }

  return crumbs
}

export function formatRole(role) {
  if (!role) return 'Not signed in'
  return ROLE_LABELS[role] ?? role
}
