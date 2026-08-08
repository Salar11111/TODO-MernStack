import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllTodos, todoApi } from '../services/api';

export const TODO_QUERY_KEY = ['todos'];

const todoListKey = (filters) => ['todos', filters];

// Update every cached "todos" list through `fn(todo)`
const patchAllTodoLists = (queryClient, fn) => {
  queryClient.setQueriesData({ queryKey: ['todos'] }, (old) => {
    if (!old || !Array.isArray(old.todos)) return old;
    return { ...old, todos: old.todos.map(fn) };
  });
};

const removeFromTodoLists = (queryClient, id) => {
  queryClient.setQueriesData({ queryKey: ['todos'] }, (old) => {
    if (!old || !Array.isArray(old.todos)) return old;
    return {
      ...old,
      todos: old.todos.filter((t) => t._id !== id),
      pagination: old.pagination
        ? { ...old.pagination, total: Math.max(0, old.pagination.total - 1) }
        : old.pagination,
    };
  });
};

const removeManyFromTodoLists = (queryClient, ids) => {
  const idSet = new Set(ids);
  queryClient.setQueriesData({ queryKey: ['todos'] }, (old) => {
    if (!old || !Array.isArray(old.todos)) return old;
    const remaining = old.todos.filter((t) => !idSet.has(t._id));
    return {
      ...old,
      todos: remaining,
      pagination: old.pagination
        ? { ...old.pagination, total: Math.max(0, old.pagination.total - (old.todos.length - remaining.length)) }
        : old.pagination,
    };
  });
};

const restoreCaches = (queryClient, previous) => {
  if (!previous) return;
  previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
};

export function useTodosQuery(filters) {
  return useQuery({
    queryKey: todoListKey(filters),
    queryFn: () => todoApi.list(filters).then((res) => res.data),
    placeholderData: (prev) => prev, // Keep showing previous results while new filters load
  });
}

// Fetch all todos (no pagination) — used by Kanban and Calendar views
export function useAllTodosQuery(enabled = true) {
  return useQuery({
    queryKey: ['todos', 'all'],
    queryFn: fetchAllTodos,
    enabled,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => todoApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => todoApi.update(id, patch).then((res) => res.data),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueriesData({ queryKey: ['todos'] });
      patchAllTodoLists(queryClient, (todo) => (todo._id === id ? { ...todo, ...patch } : todo));
      return { previous };
    },
    onError: (_err, _vars, context) => restoreCaches(queryClient, context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useBulkUpdateTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }) => todoApi.bulkUpdate(ids, patch).then((res) => res.data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => todoApi.remove(id).then((res) => res.data),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueriesData({ queryKey: ['todos'] });
      removeFromTodoLists(queryClient, id);
      return { previous };
    },
    onError: (_err, _id, context) => restoreCaches(queryClient, context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useBulkDeleteTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => todoApi.bulkDelete(ids).then((res) => res.data),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueriesData({ queryKey: ['todos'] });
      removeManyFromTodoLists(queryClient, ids);
      return { previous };
    },
    onError: (_err, _ids, context) => restoreCaches(queryClient, context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useReorderTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds) => todoApi.reorder(orderedIds).then((res) => res.data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });
}

export function useStatsQuery() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => todoApi.stats().then((res) => res.data),
    staleTime: 30_000,
  });
}
