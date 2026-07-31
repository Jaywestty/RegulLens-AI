// src/services/api.js

import axios from "axios"

const BASE_URL = "http://127.0.0.1:8000"

// Create an axios instance with our base URL
// Every request made through this instance automatically includes the base URL
const api = axios.create({
  baseURL: BASE_URL,
})

// Interceptor: runs before every request is sent
// This automatically attaches the JWT token to every request
// so individual functions don't have to do it manually
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// AUTH
export const login = (email, password) => {
  // FastAPI's OAuth2 expects form data, not JSON
  // URLSearchParams creates the right format automatically
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)
  return api.post("/auth/login", formData)
}

export const createUser = (data) => api.post("/auth/users", data)
export const listUsers = () => api.get("/auth/users")
export const deleteUser = (userId) => api.delete(`/auth/users/${userId}`)
export const getMe = () => api.get("/auth/me")
export const signupOrganization = (data) => api.post("/auth/organizations/signup", data)

// DOCUMENTS
export const uploadDocument = (formData) =>
  api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })

export const listDocuments = () => api.get("/documents/")

// QUERY
export const queryDocuments = (question) =>
  api.post("/query/", { question })

// ADMIN
export const getMetrics = () => api.get("/admin/metrics")
export const getRecentQueries = () => api.get("/admin/recent-queries")