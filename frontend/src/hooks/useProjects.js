import { useQuery } from '@tanstack/react-query';
import { api } from '../api/axios';

const fetchProjects = async () => {
  const { data } = await api.get('/projects');
  return data.data; // Matches Laravel API Resource response wrapper
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });
};