import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/login'
import UnassignedPage from './pages/UnassignedPage'

import HomePage from './pages/HomePage'
import ImplementationPlanPage from './pages/ImplementationPlanPage'
import ProjectRegistration from './pages/ProjectRegistration'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import TraceabilityMatrixPage from './pages/TraceabilityMatrixPage'
import DocumentsPage from './pages/DocumentsPage'
import ReviewsPage from './pages/ReviewsPage'
import SettingsPage from './pages/SettingsPage'
import UserManagementPage from './pages/UserManagementPage'

import AppLayout from './layouts/AppLayout'
import { getAssignedRoles, pathAllowedForRole } from './layouts/nav'

function hasAssignedRole(user) {
  return getAssignedRoles(user).length > 0
}

function PublicOnly({ children }) {
  const { user, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  if (user && hasAssignedRole(user)) return <Navigate to="/" replace />
  if (user && !hasAssignedRole(user)) return <Navigate to="/unassigned" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { user, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  if (!user) return <Navigate to="/login" replace />
  if (!hasAssignedRole(user)) return <Navigate to="/unassigned" replace />
  return children
}

function UnassignedRoute() {
  const { user, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  if (!user) return <Navigate to="/login" replace />
  if (hasAssignedRole(user)) return <Navigate to="/" replace />
  return <UnassignedPage />
}

/**
 * Blocks direct URL access when the active role cannot open that path.
 * Falls back to user.role when activeRole is not set yet.
 */
function RolePageRoute({ children }) {
  const location = useLocation()
  const { user, activeRole, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  const roleName = activeRole?.name ?? user?.role ?? null
  if (!pathAllowedForRole(location.pathname, roleName)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route path="/unassigned" element={<UnassignedRoute />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route
              path="/projects/create"
              element={
                <RolePageRoute>
                  <ProjectRegistration />
                </RolePageRoute>
              }
            />
            <Route
              path="/implementation-plan"
              element={
                <RolePageRoute>
                  <ImplementationPlanPage />
                </RolePageRoute>
              }
            />
            <Route
              path="/traceability-matrix"
              element={
                <RolePageRoute>
                  <TraceabilityMatrixPage />
                </RolePageRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <RolePageRoute>
                  <DocumentsPage />
                </RolePageRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <RolePageRoute>
                  <ReviewsPage />
                </RolePageRoute>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/user-management"
              element={
                <RolePageRoute>
                  <UserManagementPage />
                </RolePageRoute>
              }
            />
            <Route
              path="/role-management"
              element={
                <RolePageRoute>
                  <UserManagementPage />
                </RolePageRoute>
              }
            />
            <Route
              path="/password-reset"
              element={
                <RolePageRoute>
                  <UserManagementPage />
                </RolePageRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
