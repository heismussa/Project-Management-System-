import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

function IctSupportRoute({ children }) {
  const { activeRole, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  if (!pathAllowedForRole('/user-management', activeRole?.name)) return <Navigate to="/" replace />
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
            <Route path="/projects/create" element={<ProjectRegistration />} />
            <Route path="/implementation-plan" element={<ImplementationPlanPage />} />
            <Route path="/traceability-matrix" element={<TraceabilityMatrixPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/user-management"
              element={
                <IctSupportRoute>
                  <UserManagementPage />
                </IctSupportRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
