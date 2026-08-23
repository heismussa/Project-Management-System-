import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { unwrapList, unwrapItem } from '../lib/apiHelpers'

export const useActivities = (projectId) => {
  return useQuery({
    queryKey: ['activities', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const response = await api.get(`/projects/${projectId}/activities`)
      return unwrapList(response.data)
    },
    enabled: !!projectId,
  })
}

export const useSaveActivity = (projectId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values) => {
      if (values.id) {
        const response = await api.put(`/activities/${values.id}`, values)
        return unwrapItem(response.data)
      }
      const response = await api.post('/activities', { ...values, project_id: projectId })
      return unwrapItem(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] })
    },
  })
}

export const useDeleteActivity = (projectId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/activities/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] })
    },
  })
}