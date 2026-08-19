import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

export default function ProjectRegistration() {
  const [formData, setFormData] = useState({
    annual_plan_reference: '',
    category: '',
    project_type: '',
    activity_name: '',
    name: '',
    description: '',
    budget: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        annual_plan_reference: formData.annual_plan_reference,
        category: formData.category,
        project_type: formData.project_type,
        activity_name: formData.activity_name,
        name: formData.name,
        description: formData.description ? formData.description : undefined,
        budget: formData.budget !== '' ? Number(formData.budget) : undefined,
      }

      await api.post('/projects', payload)
      navigate('/home')
    } catch (err) {
      if (err.response?.status === 422) {
        const errors = err.response.data.errors || {}
        const firstKey = Object.keys(errors)[0]
        setError(errors[firstKey]?.[0] || 'Validation failed.')
      } else {
        setError(err.response?.data?.message || 'Project registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-6 text-white text-center" style={{ backgroundColor: '#962c30' }}>
          <h2 className="text-2xl font-bold tracking-wide">Create Project</h2>
          <p className="text-xs text-amber-200 mt-1 uppercase tracking-widest font-semibold">
            Implementation Tracking - Process 1
          </p>
        </div>

        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3 text-sm text-white rounded-lg font-medium shadow-sm" style={{ backgroundColor: '#962c30' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Annual Plan Reference
                </label>
                <input
                  type="text"
                  name="annual_plan_reference"
                  required
                  placeholder="e.g. NSSF-2026-APR-001"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.annual_plan_reference}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  required
                  placeholder="e.g. Operations"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Project Type
                </label>
                <input
                  type="text"
                  name="project_type"
                  required
                  placeholder="e.g. Software / Infrastructure"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.project_type}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  name="activity_name"
                  required
                  placeholder="e.g. Documentation & Planning"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.activity_name}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. NSSF Portal Module A"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Short description..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Budget (optional)
                </label>
                <input
                  type="number"
                  name="budget"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 250000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                  value={formData.budget}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-lg shadow-md transition-all duration-200 mt-2 flex items-center justify-center hover:opacity-90"
              style={{ backgroundColor: '#068737' }}
            >
              {loading ? 'Submitting...' : 'Create Project'}
            </button>
          </form>
        </div>

        <div className="h-2 w-full" style={{ backgroundColor: '#ffc20a' }} />
      </div>
    </div>
  )
}