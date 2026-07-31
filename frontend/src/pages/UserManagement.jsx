// src/pages/UserManagement.jsx

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { createUser, listUsers, deleteUser } from "../services/api"

export default function UserManagement() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [listError, setListError] = useState("")

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee",
  })
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [creating, setCreating] = useState(false)

  const [deletingId, setDeletingId] = useState(null)

  const fetchUsers = async () => {
    setLoadingUsers(true)
    setListError("")
    try {
      const res = await listUsers()
      setUsers(res.data)
    } catch (err) {
      setListError(err.response?.data?.detail || "Failed to load users.")
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError("")
    setFormSuccess("")
    setCreating(true)

    try {
      await createUser(form)
      setFormSuccess(`Account created for ${form.email}`)
      setForm({ full_name: "", email: "", password: "", role: "employee" })
      fetchUsers()
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create account.")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this account? This cannot be undone.")) return

    setDeletingId(userId)
    try {
      await deleteUser(userId)
      setUsers(users.filter((u) => u.id !== userId))
    } catch (err) {
      setListError(err.response?.data?.detail || "Failed to delete user.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">

        <div>
          <h1 className="text-white text-xl font-semibold">User Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create and manage employee, HR, and admin accounts.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-white text-sm font-semibold mb-4">Create Account</h2>

          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="employee@company.com"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                Temporary Password
              </label>
              <input
                type="text"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Set a temporary password"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {formError && (
              <p className="sm:col-span-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            {formSuccess && (
              <p className="sm:col-span-2 text-green-400 text-xs bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {formSuccess}
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                {creating ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-white text-sm font-semibold mb-4">All Users</h2>

          {listError && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
              {listError}
            </p>
          )}

          {loadingUsers ? (
            <p className="text-slate-500 text-sm">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/60">
                      <td className="py-3 pr-4 text-white">{u.full_name}</td>
                      <td className="py-3 pr-4 text-slate-400">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-xs uppercase tracking-wider">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {u.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="py-3 text-right">
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                            className="text-xs text-slate-400 hover:text-red-400 disabled:text-slate-600 transition-colors"
                          >
                            {deletingId === u.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <p className="text-slate-500 text-sm py-4 text-center">No users found.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}