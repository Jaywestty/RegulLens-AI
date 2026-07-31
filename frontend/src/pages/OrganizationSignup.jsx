// src/pages/OrganizationSignup.jsx

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signupOrganization, getMe } from "../services/api"
import { useAuth } from "../context/AuthContext"

export default function OrganizationSignup() {
  const [form, setForm] = useState({
    organization_name: "",
    admin_full_name: "",
    admin_email: "",
    admin_password: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await signupOrganization(form)
      const token = res.data.access_token

      localStorage.setItem("token", token)
      const userRes = await getMe()

      login(token, userRes.data)
      navigate("/query")
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create organization. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white opacity-90"></div>
            </div>
          </div>
          <h1 className="text-white text-xl font-semibold">Create your organization</h1>
          <p className="text-slate-400 text-sm mt-1">Set up your company's compliance platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
              Organization Name
            </label>
            <input
              type="text"
              name="organization_name"
              value={form.organization_name}
              onChange={handleChange}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Acme Inc"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
              Your Full Name
            </label>
            <input
              type="text"
              name="admin_full_name"
              value={form.admin_full_name}
              onChange={handleChange}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
              Your Email
            </label>
            <input
              type="email"
              name="admin_email"
              value={form.admin_email}
              onChange={handleChange}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              name="admin_password"
              value={form.admin_password}
              onChange={handleChange}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Creating organization..." : "Create organization"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}