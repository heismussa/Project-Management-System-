import { useEffect, useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Drawer } from 'antd'
import { Menu } from 'lucide-react'
import MainHeader from './components/MainHeader'
import Sidebar from './components/Sidebar'
import BreadCrumb from './components/BreadCrumb'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { getBreadcrumbCrumbs, pathAllowedForRole, ROLES } from './nav'
import { useAuth } from '../context/AuthContext'
import { CurrentProjectProvider, useCurrentProjectName } from '../context/CurrentProjectContext'
import './app-shell.css'

const SIDEBAR_WIDTH = 288

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768,
  )

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isDesktop
}

/** Projects header (Reviewer & Planner): just the breadcrumb row. Ongoing/Completed tabs and the
 * Register button now live inside the page's white card (see ProjectsPage) so this stays compact. */
function ProjectsStackedHeader({ crumbs, showMobileMenu, onOpenMobileMenu }) {
  return (
    <div className="mb-2 flex w-full items-center gap-2">
      {showMobileMenu && (
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMobileMenu}
          style={{
            display: 'inline-flex',
            height: 36,
            width: 36,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 6,
            backgroundColor: '#962c30',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <BreadCrumb crumbs={crumbs} className="min-w-0 flex-1" />
    </div>
  )
}

function AppLayoutShell() {
  const location = useLocation()
  const { activeRole } = useAuth()
  const { sideBarShown } = useSidebar()
  const isDesktop = useIsDesktop()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { name: currentProjectName } = useCurrentProjectName()
  const crumbs = getBreadcrumbCrumbs(location.pathname, currentProjectName)
  const sidebarOpen = sideBarShown === 1 && isDesktop
  const isProjectsList = location.pathname === '/projects'
  const isReviewer = activeRole?.name === ROLES.PRV
  const isPlanner = activeRole?.name === ROLES.PPL
  const useStackedProjectsHeader = isProjectsList && (isReviewer || isPlanner)

  return (
    <>
      <div className={`pms-shell${sidebarOpen ? '' : ' is-collapsed'}`}>
        <MainHeader />

        {sidebarOpen ? (
          <div className="pms-sidebar" aria-label="Sidenav">
            <Sidebar />
          </div>
        ) : (
          <div className="pms-sidebar" hidden />
        )}

        <div className="pms-main">
          {useStackedProjectsHeader ? (
            <ProjectsStackedHeader
              crumbs={crumbs}
              showMobileMenu={!isDesktop}
              onOpenMobileMenu={() => setMobileNavOpen(true)}
            />
          ) : (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {!isDesktop && (
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setMobileNavOpen(true)}
                  style={{
                    display: 'inline-flex',
                    height: 36,
                    width: 36,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: 6,
                    backgroundColor: '#962c30',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <BreadCrumb crumbs={crumbs} className="w-full flex-1" />
            </div>
          )}
          {pathAllowedForRole(location.pathname, activeRole?.name) ? <Outlet /> : <Navigate to="/" replace />}
        </div>
      </div>

      <Drawer
        placement="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        closable={false}
        width={SIDEBAR_WIDTH}
        styles={{ body: { padding: 0 } }}
      >
        <div role="presentation" onClick={() => setMobileNavOpen(false)}>
          <Sidebar />
        </div>
      </Drawer>
    </>
  )
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <CurrentProjectProvider>
        <AppLayoutShell />
      </CurrentProjectProvider>
    </SidebarProvider>
  )
}
