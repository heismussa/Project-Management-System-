import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Pages
import Login from './pages/login';
import Registration from './pages/Registration'; // User Account Registration
import HomePage from './pages/HomePage';
import ImplementationPlanPage from './pages/ImplementationPlanPage';
import ProjectRegistration from './pages/ProjectRegistration'; // Renamed Project Form

// Import Layout Component
import Sidebar from './components/layout/Sidebar';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-gray-50 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />

          {/* Protected Application Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/implementation-plan"
            element={
              <ProtectedRoute>
                <ImplementationPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/create"
            element={
              <ProtectedRoute>
                <ProjectRegistration />
              </ProtectedRoute>
            }
          />

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}