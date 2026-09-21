import { ROLES } from '../Config.jsx'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Inbox,
  Users,
  History,
  FileText,
  FileSearch,
} from 'lucide-react'

/**
 * Minimalist sidebar: high-level queues/dashboards only.
 * Reviewer gets Project Management (browse) + Review Project (workflow).
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
      labelsByRole: {
        [ROLES.PPL]: 'Plan Project',
        [ROLES.PAP]: 'Project History',
        [ROLES.PCO]: 'Project History',
      },
      url: '/projects',
      // ICT Support and Administrator deliberately excluded — ICT manages
      // users/audit only; Admin oversight lives on the dashboard.
      roles: [ROLES.PRV, ROLES.PVO, ROLES.PCO, ROLES.PAP, ROLES.PPL],
      icon: FolderKanban,
    },
    {
      label: 'Review Project',
      url: '/review-project',
      roles: [ROLES.PRV],
      icon: FileSearch,
    },
    {
      label: 'Generate Report',
      url: '/reports',
      roles: [ROLES.PRV],
      icon: FileText,
    },
    {
      label: 'Project Recommendations',
      labelsByRole: {
        [ROLES.PAP]: 'Approve Project',
      },
      url: '/reviews',
      roles: [ROLES.PAP],
      icon: ClipboardCheck,
    },
    {
      label: 'Project Recommendations',
      labelsByRole: {
        [ROLES.PCO]: 'Recommend Project',
      },
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
