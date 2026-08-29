import { ROLES } from '../Config.jsx'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Inbox,
  Database,
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'

/**
 * Minimalist sidebar: high-level queues/dashboards only.
 * Secondary tools (notifications, reports, nested workspaces) live in header
 * overlays or row-level drawers — not as standalone menu links.
 */
export default function Project() {
  return [
    {
      label: 'Dashboard',
      url: '/',
      roles: [],
      icon: LayoutDashboard,
    },
    {
      label: 'Project Management',
      url: '/projects',
      roles: [],
      icon: FolderKanban,
    },
    {
      label: 'Activity Queue',
      url: '/reviews',
      // Reviewer's activity/plan review now lives inline in Project Management
      // (the Details popup) — this queue is only for Approver execution sign-off.
      roles: [ROLES.PAP, ROLES.PAD],
      icon: ClipboardCheck,
    },
    {
      label: 'Recommendations',
      url: '/recommendations',
      roles: [ROLES.PCO, ROLES.PAD],
      icon: Inbox,
    },
    {
      label: 'Master data',
      url: '/admin/master-data',
      roles: [ROLES.IS, ROLES.PAD],
      icon: Database,
    },
    {
      label: 'User management',
      url: '/user-management',
      roles: [ROLES.IS, ROLES.PAD],
      icon: Users,
    },
    {
      label: 'Role management',
      url: '/role-management',
      roles: [ROLES.IS],
      icon: ShieldCheck,
    },
    {
      label: 'Password reset',
      url: '/password-reset',
      roles: [ROLES.IS],
      icon: KeyRound,
    },
    {
      label: 'Settings',
      url: '/settings',
      roles: [ROLES.IS, ROLES.PVO],
      icon: SettingsIcon,
    },
  ]
}
