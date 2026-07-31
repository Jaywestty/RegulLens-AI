// src/pages/Documents.jsx

import { useState, useEffect } from "react"
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

  const statusColor = (status) => {
    if (status === "ready") return "text-green-400 bg-green-400/10"
    if (status === "processing") return "text-yellow-400 bg-yellow-400/10"
    return "text-red-400 bg-red-400/10"
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-white text-2xl font-semibold">Documents</h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload and manage company policy documents.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-white text-sm font-medium mb-4">Upload a document</h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                File (PDF or DOCX)
              </label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300 file:text-sm hover:file:bg-slate-700 file:cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All employees</option>
                <option value="hr_only">HR and Admin only</option>
                <option value="admin_only">Admin only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">General (no department restriction)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <p className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? "Uploading..." : "Upload document"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-white text-sm font-medium mb-4">
            Indexed documents ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <p className="text-slate-600 text-sm">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg"
                >
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{doc.filename}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {doc.chunk_count} chunks · {doc.visibility}
                      {doc.department_id &&
                        ` · ${departments.find((d) => d.id === doc.department_id)?.name || "Unknown department"}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(doc.status)}`}>
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