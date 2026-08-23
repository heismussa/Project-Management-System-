import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProject) => {
      const { data } = await api.post('/projects', newProject);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};