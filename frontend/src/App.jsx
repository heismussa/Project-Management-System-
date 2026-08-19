import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

// Layouts
import AppLayout from './layouts/AppLayout'

function ProtectedRoute({ children }) {
  const { user, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
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
            <Route path="/projects/create" element={<ProjectRegistration />} />
            <Route path="/implementation-plan" element={<ImplementationPlanPage />} />
            <Route path="/traceability-matrix" element={<TraceabilityMatrixPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
