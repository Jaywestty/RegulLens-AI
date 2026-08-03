// src/pages/UserManagement.jsx

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import {
  createUser,
  listUsers,
  deleteUser,
  changeUserRole,
  listDepartments,
  createDepartment,
  assignUserDepartments,
  renameDepartment,
  deleteDepartment,
} from "../services/api"

function Panel({ title, description, children }) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
    >
      <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--color-ink)" }}>
        {title}
      </h2>
      {description && (
        <p className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>
          {description}
        </p>
      )}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  )
}

function Chip({ selected, onClick, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
      style={{
        backgroundColor: selected ? "var(--color-primary)" : "var(--color-surface)",
        color: selected ? "#FFFFFF" : "var(--color-muted)",
        border: selected ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
      }}
    >
      {children}
    </button>
  )
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [listError, setListError] = useState("")

  const [departments, setDepartments] = useState([])
  const [newDepartmentName, setNewDepartmentName] = useState("")
  const [creatingDepartment, setCreatingDepartment] = useState(false)
  const [departmentError, setDepartmentError] = useState("")

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee",
    department_ids: [],
  })
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [creating, setCreating] = useState(false)

  const [deletingId, setDeletingId] = useState(null)
  const [savingDepartmentsFor, setSavingDepartmentsFor] = useState(null)
  const [changingRoleFor, setChangingRoleFor] = useState(null)

  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingDepartmentId, setDeletingDepartmentId] = useState(null)
  const [blockedDeletion, setBlockedDeletion] = useState(null)

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

  const fetchDepartments = async () => {
    try {
      const res = await listDepartments()
      setDepartments(res.data)
    } catch (err) {
      setDepartmentError(err.response?.data?.detail || "Failed to load departments.")
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const toggleFormDepartment = (departmentId) => {
    setForm((prev) => {
      const already = prev.department_ids.includes(departmentId)
      return {
        ...prev,
        department_ids: already
          ? prev.department_ids.filter((id) => id !== departmentId)
          : [...prev.department_ids, departmentId],
      }
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError("")
    setFormSuccess("")
    setCreating(true)

    try {
      await createUser(form)
      setFormSuccess(`Account created for ${form.email}`)
      setForm({ full_name: "", email: "", password: "", role: "employee", department_ids: [] })
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

  const handleRoleChange = async (targetUser, newRole) => {
    if (newRole === targetUser.role) return

    setListError("")
    setChangingRoleFor(targetUser.id)
    try {
      const res = await changeUserRole(targetUser.id, newRole)
      setUsers(users.map((u) => (u.id === targetUser.id ? { ...u, role: res.data.role } : u)))
    } catch (err) {
      setListError(err.response?.data?.detail || "Failed to change role.")
    } finally {
      setChangingRoleFor(null)
    }
  }

  const handleCreateDepartment = async (e) => {
    e.preventDefault()
    if (!newDepartmentName.trim()) return

    setDepartmentError("")
    setCreatingDepartment(true)

    try {
      await createDepartment(newDepartmentName.trim())
      setNewDepartmentName("")
      fetchDepartments()
    } catch (err) {
      setDepartmentError(err.response?.data?.detail || "Failed to create department.")
    } finally {
      setCreatingDepartment(false)
    }
  }

  const startRename = (dept) => {
    setRenamingId(dept.id)
    setRenameValue(dept.name)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue("")
  }

  const submitRename = async (departmentId) => {
    if (!renameValue.trim()) return

    setDepartmentError("")
    try {
      await renameDepartment(departmentId, renameValue.trim())
      cancelRename()
      fetchDepartments()
    } catch (err) {
      setDepartmentError(err.response?.data?.detail || "Failed to rename department.")
    }
  }

  const handleDeleteDepartment = async (dept) => {
    setDepartmentError("")
    setBlockedDeletion(null)
    setDeletingDepartmentId(dept.id)

    try {
      await deleteDepartment(dept.id)
      fetchDepartments()
      fetchUsers()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 409 && detail) {
        setBlockedDeletion({ department: dept, ...detail })
      } else {
        setDepartmentError(detail || "Failed to delete department.")
      }
    } finally {
      setDeletingDepartmentId(null)
    }
  }

  const toggleUserDepartment = async (targetUser, departmentId) => {
    const currentIds = targetUser.departments.map((d) => d.id)
    const nextIds = currentIds.includes(departmentId)
      ? currentIds.filter((id) => id !== departmentId)
      : [...currentIds, departmentId]

    setSavingDepartmentsFor(targetUser.id)
    try {
      const res = await assignUserDepartments(targetUser.id, nextIds)
      setUsers(
        users.map((u) => (u.id === targetUser.id ? { ...u, departments: res.data } : u))
      )
    } catch (err) {
      setListError(err.response?.data?.detail || "Failed to update department access.")
    } finally {
      setSavingDepartmentsFor(null)
    }
  }

  const renderDepartmentChips = (targetUser) => {
    if (targetUser.role === "admin") {
      return <span className="text-xs" style={{ color: "var(--color-muted)" }}>All (Admin)</span>
    }
    if (departments.length === 0) {
      return <span className="text-xs" style={{ color: "var(--color-muted)" }}>No departments yet</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {departments.map((dept) => {
          const assigned = targetUser.departments.some((d) => d.id === dept.id)
          return (
            <Chip
              key={dept.id}
              selected={assigned}
              disabled={savingDepartmentsFor === targetUser.id}
              onClick={() => toggleUserDepartment(targetUser, dept.id)}
            >
              {dept.name}
            </Chip>
          )
        })}
      </div>
    )
  }

  const renderRoleControl = (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      return (
        <span
          className="px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
        >
          {targetUser.role} (you)
        </span>
      )
    }
    return (
      <select
        value={targetUser.role}
        onChange={(e) => handleRoleChange(targetUser, e.target.value)}
        disabled={changingRoleFor === targetUser.id}
        className="text-xs uppercase tracking-wider font-medium rounded-full px-2 py-1 outline-none disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-primary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <option value="employee">Employee</option>
        <option value="hr">HR</option>
        <option value="admin">Admin</option>
      </select>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 sm:px-6 py-10 lg:py-14">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            User management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            Create and manage employee, HR, and admin accounts.
          </p>
        </div>

        <Panel title="Create account">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Full name</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="employee@company.com"
              />
            </div>

            <div>
              <label className="field-label">Temporary password</label>
              <input
                type="text"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="field-input"
                placeholder="Set a temporary password"
              />
            </div>

            <div>
              <label className="field-label">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="field-input">
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Departments</label>
              {form.role === "admin" ? (
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Admins see every document regardless of department.
                </p>
              ) : departments.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  No departments created yet, add one below first if this account needs restricted access.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {departments.map((dept) => (
                    <Chip
                      key={dept.id}
                      selected={form.department_ids.includes(dept.id)}
                      onClick={() => toggleFormDepartment(dept.id)}
                    >
                      {dept.name}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {formError && <p className="sm:col-span-2 error-banner">{formError}</p>}

            {formSuccess && (
              <p
                className="sm:col-span-2 text-xs rounded-lg px-3 py-2"
                style={{ color: "#146666", backgroundColor: "#E3F5F5", border: "1px solid #A7D8D8" }}
              >
                {formSuccess}
              </p>
            )}

            <div className="sm:col-span-2">
              <button type="submit" disabled={creating} className="btn-primary sm:w-auto sm:px-8">
                {creating ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel
          title="Departments"
          description="Departments control which category-tagged documents HR and Employee accounts can see. Admins always see every document regardless of department."
        >
          <form onSubmit={handleCreateDepartment} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="e.g. Finance"
              className="field-input flex-1"
            />
            <button
              type="submit"
              disabled={creatingDepartment || !newDepartmentName.trim()}
              className="btn-primary w-auto px-5 whitespace-nowrap"
            >
              {creatingDepartment ? "Adding..." : "Add"}
            </button>
          </form>

          {departmentError && <p className="error-banner mb-3">{departmentError}</p>}

          <div className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No departments created yet.
              </p>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  {renamingId === dept.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        className="flex-1 rounded-lg px-2 py-1 text-xs outline-none"
                        style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-primary)", color: "var(--color-ink)" }}
                      />
                      <button
                        onClick={() => submitRename(dept.id)}
                        className="text-xs font-medium"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelRename}
                        className="text-xs"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-medium" style={{ color: "var(--color-ink)" }}>
                        {dept.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startRename(dept)}
                          className="text-xs transition-colors"
                          style={{ color: "var(--color-muted)" }}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept)}
                          disabled={deletingDepartmentId === dept.id}
                          className="text-xs transition-colors disabled:opacity-50"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {deletingDepartmentId === dept.id ? "Checking..." : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {blockedDeletion && (
            <div
              className="mt-4 rounded-xl p-4"
              style={{ backgroundColor: "#FEF3C7", border: "1px solid #FCD34D" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "#92400E" }}>
                Can't delete "{blockedDeletion.department.name}", still in use
              </p>
              {blockedDeletion.document_count > 0 && (
                <p className="text-xs mb-1" style={{ color: "#78350F" }}>
                  {blockedDeletion.document_count} document(s): {blockedDeletion.document_titles.join(", ")}
                </p>
              )}
              {blockedDeletion.user_count > 0 && (
                <p className="text-xs mb-2" style={{ color: "#78350F" }}>
                  {blockedDeletion.user_count} user(s): {blockedDeletion.user_emails.join(", ")}
                </p>
              )}
              <p className="text-xs" style={{ color: "#92400E" }}>
                Reassign or untag these first, then try deleting again.
              </p>
              <button
                onClick={() => setBlockedDeletion(null)}
                className="mt-2 text-xs font-medium"
                style={{ color: "#92400E" }}
              >
                Dismiss
              </button>
            </div>
          )}
        </Panel>

        <Panel title="All users">
          {listError && <p className="error-banner mb-4">{listError}</p>}

          {loadingUsers ? (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Loading users...
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--color-muted)" }}>
              No users found.
            </p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-left text-xs uppercase tracking-wider"
                      style={{ color: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}
                    >
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Role</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Departments</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="align-top" style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td className="py-3 pr-4 font-medium" style={{ color: "var(--color-ink)" }}>
                          {u.full_name}
                        </td>
                        <td className="py-3 pr-4" style={{ color: "var(--color-muted)" }}>
                          {u.email}
                        </td>
                        <td className="py-3 pr-4">{renderRoleControl(u)}</td>
                        <td className="py-3 pr-4">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={
                              u.is_active
                                ? { color: "#146666", backgroundColor: "#E3F5F5" }
                                : { color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }
                            }
                          >
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{renderDepartmentChips(u)}</td>
                        <td className="py-3 text-right">
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={deletingId === u.id}
                              className="text-xs transition-colors disabled:opacity-50"
                              style={{ color: "var(--color-muted)" }}
                            >
                              {deletingId === u.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: "var(--color-surface)" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>
                          {u.full_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
                          {u.email}
                        </p>
                      </div>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          className="flex-shrink-0 text-xs disabled:opacity-50"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {deletingId === u.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {renderRoleControl(u)}
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={
                          u.is_active
                            ? { color: "#146666", backgroundColor: "#E3F5F5" }
                            : { color: "var(--color-muted)", backgroundColor: "#FFFFFF" }
                        }
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="field-label mb-1.5">Departments</p>
                    {renderDepartmentChips(u)}
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

      </div>
    </div>
  )
}