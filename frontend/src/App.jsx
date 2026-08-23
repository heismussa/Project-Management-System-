import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider, useAuth } from './context/AuthContext'

// Public pages
import Login from './pages/login'
import Registration from './pages/Registration'

// Protected pages
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

// Layouts
import AppLayout from './layouts/AppLayout'
import { pathAllowedForRole } from './layouts/nav'

// Create TanStack Query Client instance outside component to prevent recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache data fresh state for 5 minutes
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }) {
  const { user, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RolePageRoute({ path, children }) {
  const { activeRole, user, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null

  const roleName = activeRole?.name ?? user?.role
  if (!pathAllowedForRole(path, roleName)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Registration />} />

            {/* Protected Routes inside AppLayout shell */}
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
                  <RolePageRoute path="/projects/create">
                    <ProjectRegistration />
                  </RolePageRoute>
                }
              />
              <Route
                path="/implementation-plan"
                element={
                  <RolePageRoute path="/implementation-plan">
                    <ImplementationPlanPage />
                  </RolePageRoute>
                }
              />
              <Route
                path="/traceability-matrix"
                element={
                  <RolePageRoute path="/traceability-matrix">
                    <TraceabilityMatrixPage />
                  </RolePageRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <RolePageRoute path="/documents">
                    <DocumentsPage />
                  </RolePageRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <RolePageRoute path="/reviews">
                    <ReviewsPage />
                  </RolePageRoute>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/user-management"
                element={
                  <RolePageRoute path="/user-management">
                    <UserManagementPage />
                  </RolePageRoute>
                }
              />
            </Route>

            {/* Default Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}