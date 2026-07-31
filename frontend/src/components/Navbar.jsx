// src/components/Navbar.jsx

import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // Helper to highlight the active nav link
  const isActive = (path) => location.pathname === path

  const linkClass = (path) =>
    `text-sm px-3 py-1.5 rounded transition-colors ${
      isActive(path)
        ? "bg-blue-600 text-white"
        : "text-slate-400 hover:text-white"
    }`

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-white font-semibold text-sm tracking-wide">
            Compliance Platform
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/query" className={linkClass("/query")}>
            Ask a Question
          </Link>

          {(user?.role === "hr" || user?.role === "admin") && (
            <Link to="/documents" className={linkClass("/documents")}>
              Documents
            </Link>
          )}

          {user?.role === "admin" && (
            <Link to="/dashboard" className={linkClass("/dashboard")}>
              Dashboard
            </Link>
          )}

          {(user?.role === "hr" || user?.role === "admin") && (
            <Link to="/users" className={linkClass("/users")}>
              Manage Users
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-xs">
            {user?.full_name}
            <span className="ml-2 px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-xs uppercase tracking-wider">
              {user?.role}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>

      </div>
    </nav>
  )
}