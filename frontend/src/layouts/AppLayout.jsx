import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { Button, Drawer, Segmented } from 'antd'
import { Menu, Plus } from 'lucide-react'
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

function hasPermission(user, code) {
  return (user?.permissions || []).includes(code)
}

function useProjectsView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'completed' ? 'completed' : 'ongoing'

  const setView = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'completed') params.set('view', 'completed')
    else params.delete('view')
    setSearchParams(params, { replace: true })
  }

  return { view, setView }
}

function RegisterProjectButton() {
  const navigate = useNavigate()
  return (
    <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/projects/create')}>
      Register project
    </Button>
  )
}

function ProjectsViewSwitcher({ view, setView }) {
  return (
    <Segmented
      value={view}
      onChange={setView}
      options={[
        { label: 'Ongoing', value: 'ongoing' },
        { label: 'Completed', value: 'completed' },
      ]}
    />
  )
}

/** Stacked projects header (Reviewer & Planner): tabs under breadcrumbs; Register only when allowed. */
function ProjectsStackedHeader({ crumbs, showMobileMenu, onOpenMobileMenu, canRegister }) {
  const { view, setView } = useProjectsView()
  const showRegister = canRegister && view === 'ongoing'

  return (
    <div className="mb-2 flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
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

      <div className="flex w-full items-center justify-between gap-2">
        <ProjectsViewSwitcher view={view} setView={setView} />
        {showRegister ? <RegisterProjectButton /> : <span className="shrink-0" aria-hidden="true" />}
      </div>
    </div>
  )
}

/** Default (non-Reviewer) projects toolbar — single row beside breadcrumbs. */
function DefaultProjectsHeaderExtras({ canRegister }) {
  const { view, setView } = useProjectsView()

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
      <ProjectsViewSwitcher view={view} setView={setView} />
      {canRegister && view === 'ongoing' && <RegisterProjectButton />}
    </div>
  )
}

function AppLayoutShell() {
  const location = useLocation()
  const { user, activeRole } = useAuth()
  const { sideBarShown } = useSidebar()
  const isDesktop = useIsDesktop()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { name: currentProjectName } = useCurrentProjectName()
  const crumbs = getBreadcrumbCrumbs(location.pathname, currentProjectName)
  const sidebarOpen = sideBarShown === 1 && isDesktop
  const isProjectsList = location.pathname === '/projects'
  const isReviewer = activeRole?.name === ROLES.PRV
  const isPlanner = activeRole?.name === ROLES.PPL
  // Planners never register projects; Reviewer/Admin only, and only on Ongoing.
  const canRegister =
    activeRole?.name !== ROLES.PPL &&
    (activeRole?.name === ROLES.PRV || activeRole?.name === ROLES.PAD) &&
    hasPermission(user, 'projects.register')
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
              canRegister={canRegister}
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
              <BreadCrumb
                crumbs={crumbs}
                className={isProjectsList ? 'max-w-full shrink sm:max-w-[45%]' : 'w-full flex-1'}
              />
              {isProjectsList && <DefaultProjectsHeaderExtras canRegister={canRegister} />}
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
