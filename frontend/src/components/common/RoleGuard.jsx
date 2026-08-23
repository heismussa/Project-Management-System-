import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Conditionally renders children based on user role authorization.
 * Supports string or array values for `allow` and `forbid`.
 */
export function RoleGuard({ 
  allow = [], 
  forbid = [], 
  fallback = null, 
  children 
}) {
  const { user, activeRole, loading, isLoading } = useAuth();

  // Prevent unauthorized flashes or early redirects while auth state initializes
  if (loading || isLoading) {
    return null;
  }

  if (!user) return fallback;

  // Determine active role name from AuthContext
  const activeName = activeRole?.name ?? user?.role;

  // Normalize props to handle both string ("Admin") and array (['Admin', 'Manager']) inputs
  const allowedList = Array.isArray(allow) ? allow : [allow];
  const forbiddenList = Array.isArray(forbid) ? forbid : [forbid];

  // Block forbidden roles
  if (forbiddenList.length > 0 && forbiddenList.includes(activeName)) {
    return fallback;
  }

  // Enforce allowed roles if specified
  if (allowedList.length > 0 && !allowedList.includes(activeName)) {
    return fallback;
  }

  return children;
}

/**
 * Wrapper component to hide or disable write/edit UI elements for read-only roles.
 */
export function PreventMutation({ fallback = null, children }) {
  return (
    <RoleGuard forbid={['Project ViewOnly', 'ViewOnly']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export default RoleGuard;