// src/pages/Login.jsx

import { useState } from "react"
import { login as loginApi, getMe } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Link, useNavigate } from "react-router-dom"
import BrandMark from "../components/BrandMark"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const tokenRes = await loginApi(email, password)
      const token = tokenRes.data.access_token

      localStorage.setItem("token", token)
      const userRes = await getMe()

      login(token, userRes.data)
      navigate("/query")
    } catch (err) {
      setError("Incorrect email or password. Please try again.")
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
          Regulens AI
        </h1>
        <p className="text-white/80 text-sm mt-2 max-w-xs relative">
          Ask your company's policies a question and get a cited, trustworthy answer in seconds.
        </p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">

          <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--color-ink)" }}>
            Sign in to continue
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
            Enter your details to access your workspace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field-input"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field-input"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="error-banner">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--color-muted)" }}>
            Don't have an organization yet?{" "}
            <Link to="/signup" className="font-semibold" style={{ color: "var(--color-primary)" }}>
              Create one
            </Link>
          </p>

        </div>
      </div>

    </div>
  )
}