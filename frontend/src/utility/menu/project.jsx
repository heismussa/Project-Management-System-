import { ROLES } from '../Config.jsx'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Inbox,
  Database,
  Users,
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
      roles: [ROLES.IS, ROLES.PAD, ROLES.PRV, ROLES.PVO],
      icon: FolderKanban,
    },
    {
      label: 'Assigned Projects',
      url: '/projects',
      roles: [ROLES.PPL],
      icon: FolderKanban,
    },
    {
      label: 'Recommendations',
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
      label: 'Recommendations',
      url: '/recommendations',
      roles: [ROLES.PCO],
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
  ]
}
