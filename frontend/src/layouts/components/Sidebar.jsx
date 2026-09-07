import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Project from '../../utility/menu/project.jsx'
import SwitchRole from './SwitchRole'

function navClassName(isActive) {
  return [
    'nav-link group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-500 hover:bg-primary hover:text-white',
    isActive ? 'active' : '',
  ].join(' ')
}

export default function Sidebar() {
  const { activeRole } = useAuth()
  const location = useLocation()
  const menuLinks = Project()
  const myRoles = activeRole?.name ? [activeRole.name] : []

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 grow flex-col gap-y-5 overflow-y-auto px-[10px]">
        <nav className="flex flex-1 flex-col pt-2">
          <SwitchRole />
          <ul className="mt-1 flex w-full flex-1 flex-col gap-y-1.5">
            {menuLinks.map((group) => {
              const groupRoles = group.roles || []
              const canSee =
                groupRoles.length === 0 || myRoles.some((role) => groupRoles.includes(role))
              if (!canSee) return null

              const active =
                group.url === '/'
                  ? location.pathname === '/' || location.pathname === '/home'
                  : location.pathname.startsWith(group.url)

              return (
                <li key={group.url} className="-mx-2">
                  <NavLink to={group.url} end={group.url === '/'} className={() => navClassName(active)}>
                    <group.icon
                      className="nav-icon h-6 w-6 shrink-0 text-primary group-hover:text-white"
                      aria-hidden="true"
                    />
                    <div className="truncate">{group.label}</div>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
