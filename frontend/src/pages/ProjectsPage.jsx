import React from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { PreventMutation } from '../components/common/RoleGuard';

export default function ProjectsPage() {
  const { data: projects, isLoading, isError, error } = useProjects();

  if (isLoading) {
    return <div className="p-6 text-gray-600">Loading projects...</div>;
  }

  if (isError) {
    return <div className="p-6 text-red-500">Error loading projects: {error.message}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
        
        {/* Hides Create button for Read-Only roles */}
        <PreventMutation>
          <Link
            to="/projects/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Create New Project
          </Link>
        </PreventMutation>
      </div>

      {projects?.length === 0 ? (
        <div className="p-4 bg-gray-50 border rounded-lg text-gray-500">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <div key={project.id} className="border p-4 rounded-xl shadow-sm bg-white hover:shadow-md transition">
              <h3 className="font-semibold text-lg text-gray-900">{project.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{project.description || 'No description provided.'}</p>
              <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                <span className="capitalize px-2 py-1 bg-gray-100 rounded-full">
                  Status: {project.status || 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}