import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../hooks/useCreateProject';

export default function ProjectRegistration() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const createProject = useCreateProject();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    createProject.mutate(
      { title, description, status: 'pending' },
      {
        onSuccess: () => {
          navigate('/projects');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-sm border mt-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Create New Project</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter project title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter project description"
          />
        </div>
        <button
          type="submit"
          disabled={createProject.isPending}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {createProject.isPending ? 'Saving Project...' : 'Save Project'}
        </button>
      </form>
    </div>
  );
}