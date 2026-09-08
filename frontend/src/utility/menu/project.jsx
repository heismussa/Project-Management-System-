import { ROLES } from '../Config.jsx'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Inbox,
  Users,
  History,
  FileText,
} from 'lucide-react'

/**
 * Minimalist sidebar: high-level queues/dashboards only.
 * Secondary tools (notifications, nested workspaces) live in header
 * overlays or row-level drawers — not as standalone menu links. Reports is
 * the deliberate exception: Admin/Reviewer asked for it as a real tab.
 */
export default function Project() {
  return [
    {
      // Every tab label in this list is deliberately two words — Dashboard
      // alone next to Project Management/User Management/Audit Log/Project
      // Reports read as inconsistent line lengths in the same sidebar.
      label: 'Main Dashboard',
      url: '/',
      roles: [],
      icon: LayoutDashboard,
    },
    {
      // Same page and label for every role that lands here — the Planner's
      // copy is scoped to their own assigned projects while everyone else
      // sees the full list, but it's the same feature, so it keeps the same
      // name rather than "Assigned Projects" vs "Project Management".
      label: 'Project Management',
      url: '/projects',
      // Coordinator/Approver are here too, view-only — their part is done
      // once they've recommended/signed off, but they can still look up any
      // project (including the ones no longer in their own queue). Every
      // mutating action in this view is already independently gated to
      // Planner/Reviewer/Admin, so adding these two roles doesn't grant
      // them anything beyond visibility.
      roles: [ROLES.IS, ROLES.PAD, ROLES.PRV, ROLES.PVO, ROLES.PCO, ROLES.PAP, ROLES.PPL],
      icon: FolderKanban,
    },
    {
      label: 'Project Recommendations',
      url: '/reviews',
      // Reviewer's activity/plan review now lives inline in Project Management
      // (the Details popup) — this queue is Approver execution sign-off (DICT
      // only) for PAP; Administrator lands on the same page but unfiltered,
      // so they see every track (SDMM/IDMM/DICT) — no separate admin entry
      // needed for the Coordinator-only /recommendations queue below.
      roles: [ROLES.PAP, ROLES.PAD],
      icon: ClipboardCheck,
    },
    {
      label: 'Project Recommendations',
      url: '/recommendations',
      roles: [ROLES.PCO],
      icon: Inbox,
    },
    {
      label: 'User Management',
      url: '/user-management',
      roles: [ROLES.IS, ROLES.PAD],
      icon: Users,
    },
    {
      label: 'Audit Log',
      url: '/audit-log',
      roles: [ROLES.IS, ROLES.PAD],
      icon: History,
    },
    {
      label: 'Project Reports',
      url: '/reports',
      roles: [ROLES.PAD, ROLES.PRV],
      icon: FileText,
    },
  ]
}
