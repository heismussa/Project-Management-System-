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
 * overlays or row-level drawers — not as standalone menu links.
 * Generate Report is Reviewer-only (below Project Management).
 * Administrator does not get Project Management or Generate Report.
 */
export default function Project() {
  return [
    {
      label: 'Main Dashboard',
      url: '/',
      roles: [],
      icon: LayoutDashboard,
    },
    {
      label: 'Project Management',
      url: '/projects',
      // Administrator deliberately excluded — portfolio oversight is on the
      // Admin dashboard; day-to-day project work stays with other roles.
      roles: [ROLES.IS, ROLES.PRV, ROLES.PVO, ROLES.PCO, ROLES.PAP, ROLES.PPL],
      icon: FolderKanban,
    },
    {
      label: 'Generate Report',
      url: '/reports',
      // Placed directly under Project Management so Reviewer sees:
      // Main Dashboard → Project Management → Generate Report.
      roles: [ROLES.PRV],
      icon: FileText,
    },
    {
      label: 'Project Recommendations',
      url: '/reviews',
      roles: [ROLES.PAP],
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
  ]
}
