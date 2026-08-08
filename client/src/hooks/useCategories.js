import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../services/api';
import { toast } from 'sonner';

export const CATEGORY_QUERY_KEY = ['categories'];

export function useCategoriesQuery() {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEY,
    queryFn: () => categoryApi.list().then((res) => res.data),
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => categoryApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
      toast.success('Category created');
    },
    onError: (err) => toast.error(err.message || 'Failed to create category'),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => categoryApi.update(id, patch).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
      toast.success('Category updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update category'),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => categoryApi.remove(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      toast.success('Category deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete category'),
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds) => categoryApi.reorder(orderedIds).then((res) => res.data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY }),
  });
}
