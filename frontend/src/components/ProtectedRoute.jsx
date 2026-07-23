// src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  // Still checking if user is logged in — show nothing yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  // Not logged in at all — send to login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role — send to query page (their home)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/query" replace />
  }

  // All checks passed — render the page
  return children
}