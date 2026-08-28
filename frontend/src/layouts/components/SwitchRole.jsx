import { Dropdown } from 'antd'
import { ChevronDown } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { formatRoleLabel, pathAllowedForRole } from '../nav'

export default function SwitchRole() {
  const { assignedRoles, activeRole, switchRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!assignedRoles.length) {
    return (
      <div className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600">
        No role assigned
        <div className="mt-1 text-xs font-normal text-gray-500">
          Ask ICT Support to assign a role. Only Dashboard and Project Management show until then.
        </div>
      </div>
    )
  }

  const currentId = activeRole?.id ?? activeRole?.name
  const otherRoles = assignedRoles.filter(
    (role) => String(role.id ?? role.name) !== String(currentId),
  )

  const selectRole = (role) => {
    switchRole(role)
    if (!pathAllowedForRole(location.pathname, role.name)) {
      navigate('/', { replace: true })
    }
  }

  const button = (
    <button
      type="button"
      className="flex w-full justify-between gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 transition-colors duration-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600 dark:hover:bg-gray-600"
    >
      <span className="truncate">{formatRoleLabel(activeRole?.name)}</span>
      {otherRoles.length > 0 && (
        <ChevronDown className="-mr-1 h-5 w-5 shrink-0 text-gray-400 dark:text-gray-300" aria-hidden="true" />
      )}
    </button>
  )

  if (!otherRoles.length) return button

  return (
    <div className="relative inline-block w-full text-left">
      <Dropdown
        trigger={['click']}
        getPopupContainer={(node) => node.parentElement}
        menu={{
          items: otherRoles.map((role) => ({
            key: String(role.id ?? role.name),
            label: formatRoleLabel(role.name),
            onClick: () => selectRole(role),
          })),
        }}
      >
        {button}
      </Dropdown>
    </div>
  )
}
