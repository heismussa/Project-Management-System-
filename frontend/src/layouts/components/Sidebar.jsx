import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { canManageUsers, formatUserRoles, ICT_SUPPORT_NAV_ITEMS, NAV_ITEMS } from '../nav'

function navClassName(isActive) {
  return [
    'nav-link group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-500 hover:bg-primary hover:text-white',
    isActive ? 'active' : '',
  ].join(' ')
}

function NavItem({ item, active }) {
  return (
    <li className="mx-0">
      <NavLink to={item.path} end={item.path === '/'} className={() => navClassName(active)}>
        <item.Icon className="nav-icon h-6 w-6 shrink-0 text-primary group-hover:text-white" aria-hidden="true" />
        <div className="truncate">{item.label}</div>
      </NavLink>
    </li>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const showIctSupport = canManageUsers(user)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 grow flex-col gap-y-5 overflow-y-auto px-[10px]">
        <nav className="flex flex-1 flex-col pt-2">
          <div className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600">
            {formatUserRoles(user)}
          </div>
          <ul role="list" className="flex flex-1 flex-col gap-y-2.5 pt-2">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                active={
                  item.path === '/'
                    ? location.pathname === '/' || location.pathname === '/home'
                    : location.pathname.startsWith(item.path)
                }
              />
            ))}

            {showIctSupport && (
              <>
                <li className="px-2 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  ICT Support
                </li>
                {ICT_SUPPORT_NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    active={location.pathname.startsWith(item.path)}
                  />
                ))}
              </>
            )}
          </ul>
        </nav>
      </div>
    </div>
  )
}
