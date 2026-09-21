import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Project from '../../utility/menu/project.jsx'
import { resolveNavLabel } from '../nav'
import SwitchRole from './SwitchRole'

function navClassName(isActive) {
  return [
    'nav-link group flex items-center gap-x-3 rounded-md px-3.5 py-3.5 text-[14px] font-medium leading-snug text-gray-700 transition-colors duration-150',
    'hover:bg-[#fbeaea] hover:text-[#7b1e1e]',
    isActive ? 'active' : '',
  ].join(' ')
}

export default function Sidebar() {
  const { activeRole } = useAuth()
  const location = useLocation()
  const menuLinks = Project()
  const roleName = activeRole?.name
  const myRoles = roleName ? [roleName] : []

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 grow flex-col gap-y-5 overflow-y-auto px-3">
        <nav className="flex flex-1 flex-col pt-3">
          <SwitchRole />
          <ul className="mt-3 flex w-full flex-1 flex-col gap-y-1">
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
                <li key={group.url}>
                  <NavLink to={group.url} end={group.url === '/'} className={() => navClassName(active)}>
                    <group.icon
                      className="nav-icon h-5 w-5 shrink-0 text-[#7b1e1e] group-hover:text-[#7b1e1e]"
                      aria-hidden="true"
                    />
                    <div className="truncate">{resolveNavLabel(group, roleName)}</div>
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
