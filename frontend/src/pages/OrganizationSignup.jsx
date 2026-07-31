// src/pages/OrganizationSignup.jsx

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signupOrganization, getMe } from "../services/api"
import { useAuth } from "../context/AuthContext"
import BrandMark from "../components/BrandMark"

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      <div
        className="lg:w-1/2 lg:min-h-screen flex flex-col justify-center items-center px-8 py-10 lg:py-0 text-white text-center relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1E8A8A 0%, #146666 100%)" }}
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white opacity-5" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white opacity-5" />

        <BrandMark className="w-14 h-14 mb-4 relative" />
        <h1 className="font-display text-2xl lg:text-3xl font-bold relative">
          Compliance Intelligence
        </h1>
        <p className="text-white/80 text-sm mt-2 max-w-xs relative">
          Set up your company's private workspace in under a minute.
        </p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">

          <button
            onClick={() => navigate("/login")}
            aria-label="Back to sign in"
            className="back-btn mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--color-ink)" }}>
            Create your organization
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
            You'll be the first admin for your company's workspace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Organization name</label>
              <input
                type="text"
                name="organization_name"
                value={form.organization_name}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="Acme Inc"
              />
            </div>

            <div>
              <label className="field-label">Your full name</label>
              <input
                type="text"
                name="admin_full_name"
                value={form.admin_full_name}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="field-label">Your email</label>
              <input
                type="email"
                name="admin_email"
                value={form.admin_email}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                name="admin_password"
                value={form.admin_password}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="error-banner">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating organization..." : "Create organization"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--color-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold" style={{ color: "var(--color-primary)" }}>
              Sign in
            </Link>
          </p>

        </div>
      </div>

    </div>
  )
}