// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react"
import { getMe } from "../services/api"

// createContext makes the "container" that holds our global state
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // the logged-in user object
  const [loading, setLoading] = useState(true)  // are we still checking if logged in?

  useEffect(() => {
    // When the app first loads, check if a token exists in localStorage
    // If it does, fetch the user's profile to restore their session
    // This means refreshing the page doesn't log you out
    const token = localStorage.getItem("token")
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (token, userData) => {
    localStorage.setItem("token", token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
  }

  // 'value' is what every child component can access from this context
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — instead of writing useContext(AuthContext) everywhere,
// components just write useAuth() which is cleaner and easier to read
export const useAuth = () => useContext(AuthContext)