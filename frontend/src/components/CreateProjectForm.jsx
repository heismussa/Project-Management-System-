import React, { useState } from 'react';
import { useCreateProject } from '../hooks/useCreateProject';

export const CreateProjectForm = () => {
  const [title, setTitle] = useState('');
  const createProject = useCreateProject();

  const handleSubmit = (e) => {
    e.preventDefault();
    createProject.mutate({ title, status: 'pending' }, {
      onSuccess: () => setTitle(''),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Project Title"
      />
      <button type="submit" disabled={createProject.isPending}>
        {createProject.isPending ? 'Creating...' : 'Add Project'}
      </button>
    </form>
  );
};