import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

// Fetch all documents or filter by projectId
export const useDocuments = (projectId = null) => {
  return useQuery({
    queryKey: ['documents', { projectId }],
    queryFn: async () => {
      const url = projectId ? `/projects/${projectId}/documents` : '/documents';
      const { data } = await api.get(url);
      return data.data;
    },
  });
};

// Upload document (handles Multipart / FormData)
export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};