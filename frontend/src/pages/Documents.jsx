// src/pages/Documents.jsx

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { uploadDocument, listDocuments, listDepartments } from "../services/api"
import Navbar from "../components/Navbar"

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [file, setFile] = useState(null)
  const [visibility, setVisibility] = useState("all")
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDocuments()
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await listDepartments()
      setDepartments(res.data)
    } catch {
      // Non-fatal — upload still works without department assignment
    }
  }

  const fetchDocuments = async () => {
    try {
      const res = await listDocuments()
      setDocuments(res.data)
    } catch {
      setError("Could not load documents.")
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ""
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setMessage("")
    setError("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("visibility", visibility)
    if (departmentId) {
      formData.append("department_id", departmentId)
    }

    try {
      const res = await uploadDocument(formData)
      setMessage(`Uploaded successfully. ${res.data.chunks_created} chunks indexed.`)
      setFile(null)
      setDepartmentId("")
      fetchDocuments()
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const statusStyle = (status) => {
    if (status === "ready") return { color: "#146666", backgroundColor: "#E3F5F5" }
    if (status === "processing") return { color: "#92400E", backgroundColor: "#FEF3C7" }
    return { color: "#991B1B", backgroundColor: "#FEE2E2" }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 lg:py-14">

        <button
          onClick={() => navigate("/query")}
          aria-label="Back to ask a question"
          className="back-btn mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            Documents
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            Upload and manage company policy documents.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 mb-10"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
            Upload a document
          </h2>

          <form onSubmit={handleUpload} className="space-y-5">

            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center text-center rounded-2xl py-10 px-4 cursor-pointer transition-colors"
              style={{
                border: `1.5px dashed ${isDragging ? "var(--color-primary)" : "var(--color-border)"}`,
                backgroundColor: isDragging ? "var(--color-surface)" : "#FAFEFE",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
                  Drag &amp; drop
                </span>{" "}
                or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                PDF or DOCX, up to 50 MB
              </p>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
            </label>

            {file && (
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
                    {file.name}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--color-muted)" }}>
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Remove file"
                  className="flex-shrink-0 text-lg leading-none px-1"
                  style={{ color: "var(--color-muted)" }}
                >
                  ×
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="field-input"
                >
                  <option value="all">All employees</option>
                  <option value="hr_only">HR and Admin only</option>
                  <option value="admin_only">Admin only</option>
                </select>
              </div>

              <div>
                <label className="field-label">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="field-input"
                >
                  <option value="">General (no restriction)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {message && (
              <p
                className="text-xs rounded-lg px-3 py-2"
                style={{ color: "#146666", backgroundColor: "#E3F5F5", border: "1px solid #A7D8D8" }}
              >
                {message}
              </p>
            )}

            {error && <p className="error-banner">{error}</p>}

            <button
              type="submit"
              disabled={uploading || !file}
              className="btn-primary sm:w-auto sm:px-8"
            >
              {uploading ? "Uploading..." : "Upload document"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
            Indexed documents ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              No documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>
                      {doc.filename}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {doc.chunk_count} chunks · {doc.visibility}
                      {doc.department_id &&
                        ` · ${departments.find((d) => d.id === doc.department_id)?.name || "Unknown department"}`}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={statusStyle(doc.status)}
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}