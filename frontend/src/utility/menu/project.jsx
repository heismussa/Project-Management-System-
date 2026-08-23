import { ROLES } from '../Config.jsx'
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

export default function Project() {
  return [
    {
      label: 'Dashboard',
      url: '/',
      roles: [],
      icon: LayoutDashboard,
    },
    {
      label: 'Projects',
      url: '/projects',
      roles: [],
      icon: FolderKanban,
    },
    {
      label: 'Implementation Plan',
      url: '/implementation-plan',
      roles: [ROLES.PPL, ROLES.PIM, ROLES.PRV, ROLES.PCO, ROLES.PAP, ROLES.PVO, ROLES.PAD],
      icon: ClipboardList,
    },
    {
      label: 'Traceability Matrix',
      url: '/traceability-matrix',
      roles: [ROLES.PPL, ROLES.PRV, ROLES.PIM, ROLES.PAD],
      icon: Network,
    },
    {
      label: 'Documents',
      url: '/documents',
      roles: [ROLES.PRV, ROLES.PPL, ROLES.PIM, ROLES.PVO, ROLES.PAD],
      icon: FileText,
    },
    {
      label: 'Reviews',
      url: '/reviews',
      roles: [ROLES.PRV, ROLES.PCO, ROLES.PAP, ROLES.PAD],
      icon: ClipboardCheck,
    },
    {
      label: 'Settings',
      url: '/settings',
      roles: [ROLES.IS],
      icon: SettingsIcon,
    },
    {
      label: 'User Management',
      url: '/user-management',
      roles: [ROLES.IS, ROLES.PAD],
      icon: Users,
    },
  ]
}
