// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/Login"
import Query from "./pages/Query"
import Documents from "./pages/Documents"
import Dashboard from "./pages/Dashboard"
import UserManagement from "./pages/UserManagement"
import OrganizationSignup from "./pages/OrganizationSignup"
import AuditLog from "./pages/AuditLog"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<OrganizationSignup />} />

          <Route
            path="/query"
            element={
              <ProtectedRoute>
                <Query />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRoles={["hr", "admin"]}>
                <Documents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["hr", "admin"]}>
                <UserManagement />
              </ProtectedRoute>
        }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AuditLog />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/query" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}