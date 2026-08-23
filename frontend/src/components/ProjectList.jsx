import React from 'react';
import { useProjects } from '../hooks/useProjects';

export const ProjectList = () => {
  const { data: projects, isLoading, isError, error } = useProjects();

  if (isLoading) return <div>Loading projects...</div>;
  if (isError) return <div>Error loading projects: {error.message}</div>;

  return (
    <ul>
      {projects?.map((project) => (
        <li key={project.id}>
          <strong>{project.title}</strong> — {project.status}
        </li>
      ))}
    </ul>
  );
};