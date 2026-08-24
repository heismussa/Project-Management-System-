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
  ShieldCheck,
  KeyRound,
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
      roles: [ROLES.PPL, ROLES.PRV, ROLES.PIM, ROLES.PCO, ROLES.PAP, ROLES.PVO, ROLES.PAD],
      icon: Network,
    },
    {
      label: 'Documents',
      url: '/documents',
      roles: [ROLES.PRV, ROLES.PPL, ROLES.PIM, ROLES.PCO, ROLES.PAP, ROLES.PVO, ROLES.PAD],
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
      roles: [ROLES.IS, ROLES.PRV, ROLES.PVO],
      icon: SettingsIcon,
    },
  ]
}
