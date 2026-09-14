import { ROLES } from '../Config.jsx'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  ClipboardList,
  Inbox,
  ListChecks,
  Users,
  History,
  FileText,
} from 'lucide-react'

/**
 * Minimalist sidebar: high-level queues/dashboards only.
 * Secondary tools (notifications, nested workspaces) live in header
 * overlays or row-level drawers — not as standalone menu links. Reports is
 * the deliberate exception: Reviewer asked for it as a real tab.
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
      // Full, unscoped portfolio browser — Reviewer-only. Planner/
      // Coordinator/Approver each have their own Pending/History queue page
      // instead (scoped to only what's relevant to them), and nobody else
      // gets a project-level browse screen.
      label: 'Project Management',
      url: '/projects',
      roles: [ROLES.PRV],
      icon: FolderKanban,
    },
    {
      label: 'Planning Queue',
      url: '/planning-queue',
      // The Planner's own action list — projects with no plan yet or a plan
      // returned for fixes — each opening straight into the Implementation
      // Plan workspace. Project Management already shows this Planner's
      // full assigned list; this is the "what needs me right now" subset.
      // (Overdue activities / rejected items already have their own tables
      // on the Planner's dashboard.)
      roles: [ROLES.PPL],
      icon: ClipboardList,
    },
    {
      label: 'Review Queue',
      url: '/review-queue',
      // The Reviewer's own action list — plan reviews and closure sign-offs
      // awaiting a decision. Same underlying queue page Coordinator/Approver
      // use below, scoped to the two queues a Reviewer acts on.
      roles: [ROLES.PRV],
      icon: ListChecks,
    },
    {
      label: 'Project Recommendations',
      url: '/reviews',
      // Approver execution sign-off (DICT only) for PAP. Administrator no
      // longer gets a sidebar tab for it — oversight happens through Project
      // Management instead.
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
    {
      // Report generation (Word/Excel/PDF, individual and portfolio-wide) is
      // Reviewer-only.
      label: 'Project Reports',
      url: '/reports',
      roles: [ROLES.PRV],
      icon: FileText,
    },
  ]
}
